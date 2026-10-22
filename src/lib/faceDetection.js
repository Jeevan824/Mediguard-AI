/**
 * Face detection using MediaPipe FaceMesh — Enhanced v2.
 * Improvements:
 *  - Higher confidence thresholds (0.65) for better accuracy
 *  - Head pose estimation (pitch/yaw) from nose tip + chin landmarks
 *  - Blink confidence scoring (depth × duration)
 *  - requestAnimationFrame-based loop for lower latency
 */

const LEFT_EYE  = { top: [159, 158], bottom: [145, 153], outer: 33,  inner: 133 };
const RIGHT_EYE = { top: [386, 385], bottom: [374, 380], outer: 362, inner: 263 };

function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Calculate Eye Aspect Ratio (EAR) — average of both eyes.
 */
export function calculateEAR(landmarks) {
    const leftEAR  = calcSingleEAR(landmarks, LEFT_EYE);
    const rightEAR = calcSingleEAR(landmarks, RIGHT_EYE);
    return (leftEAR + rightEAR) / 2;
}

function calcSingleEAR(lm, eye) {
    const v1 = distance(lm[eye.top[0]],    lm[eye.bottom[0]]);
    const v2 = distance(lm[eye.top[1]],    lm[eye.bottom[1]]);
    const h  = distance(lm[eye.outer],     lm[eye.inner]);
    if (h === 0) return 0.3;
    return (v1 + v2) / (2 * h);
}

/**
 * Head Pose Estimator.
 * Uses nose tip (1), chin (152), left (234) & right (454) face edges.
 * Returns { pitch, yaw, distraction } — distraction is 0-100 normalized score.
 */
export function estimateHeadPose(landmarks, width, height) {
    try {
        const nose  = landmarks[1];
        const chin  = landmarks[152];
        const left  = landmarks[234];
        const right = landmarks[454];
        const forehead = landmarks[10];

        if (!nose || !chin || !left || !right || !forehead) return { pitch: 0, yaw: 0, distraction: 0 };

        // Yaw: horizontal asymmetry between nose and face center
        const faceCenter = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
        const faceWidth  = distance(left, right);
        const yawOffset  = (nose.x - faceCenter.x) / (faceWidth / 2); // -1 to +1
        const yaw        = Math.round(yawOffset * 45); // degrees estimate

        // Pitch: vertical nose offset relative to forehead-chin axis
        const faceHeight = distance(forehead, chin);
        const midY       = (forehead.y + chin.y) / 2;
        const pitchOffset = (nose.y - midY) / (faceHeight / 2);
        const pitch       = Math.round(pitchOffset * 30);

        // Distraction score: combined absolute yaw + pitch (0-100)
        const distraction = Math.min(100, Math.round((Math.abs(yaw) / 45 * 60) + (Math.abs(pitch) / 30 * 40)));

        return { pitch, yaw, distraction };
    } catch {
        return { pitch: 0, yaw: 0, distraction: 0 };
    }
}

/**
 * EAR Smoother — exponential moving average to reduce noise.
 */
export class EARSmoother {
    constructor(alpha = 0.3) {
        this.alpha    = alpha;
        this.smoothed = null;
    }

    update(rawEAR) {
        if (this.smoothed === null) {
            this.smoothed = rawEAR;
        } else {
            this.smoothed = this.alpha * rawEAR + (1 - this.alpha) * this.smoothed;
        }
        return this.smoothed;
    }

    get() { return this.smoothed || 0.3; }
}

/**
 * Blink Detector — adaptive threshold + confidence scoring.
 * Confidence = depth of EAR dip × number of frames below threshold.
 */
export class BlinkDetector {
    constructor(threshold = 0.2, minFrames = 2, maxFrames = 8) {
        this.threshold        = threshold;
        this.minFrames        = minFrames;
        this.maxFrames        = maxFrames;
        this.belowCount       = 0;
        this.minEARDuringBlink = 1;  // tracks deepest dip in current blink
        this.blinkTimestamps  = [];
        this.blinkConfidences = [];  // confidence of each blink (0-100)
        this.totalBlinks      = 0;
        this.earHistory       = [];
        this.calibrated       = false;
        this.lastConfidence   = 0;
    }

    update(ear) {
        // Adaptive calibration after 60 samples
        this.earHistory.push(ear);
        if (this.earHistory.length > 100) this.earHistory.shift();
        if (!this.calibrated && this.earHistory.length >= 60) {
            this._calibrate();
        }

        if (ear < this.threshold) {
            this.belowCount++;
            if (ear < this.minEARDuringBlink) this.minEARDuringBlink = ear;
        } else {
            if (this.belowCount >= this.minFrames && this.belowCount <= this.maxFrames) {
                this.totalBlinks++;
                const now = Date.now();
                this.blinkTimestamps.push(now);

                // Confidence: deeper dip + longer but not too long = higher confidence
                const depthRatio     = 1 - (this.minEARDuringBlink / this.threshold);
                const durationScore  = Math.min(1, this.belowCount / this.minFrames);
                const confidence     = Math.round(Math.min(100, (depthRatio * 70 + durationScore * 30)));
                this.blinkConfidences.push(confidence);
                this.lastConfidence  = confidence;
            }
            this.belowCount        = 0;
            this.minEARDuringBlink = 1;
        }
        return this.belowCount === 0 && this.blinkTimestamps.length > 0
            ? this.blinkTimestamps[this.blinkTimestamps.length - 1] === Date.now()
            : false;
    }

    _calibrate() {
        const sorted   = [...this.earHistory].sort((a, b) => a - b);
        const median   = sorted[Math.floor(sorted.length / 2)];
        this.threshold = Math.max(0.15, Math.min(0.25, median * 0.75));
        this.calibrated = true;
    }

    getBlinksPerMinute() {
        const now      = Date.now();
        const oneMinAgo = now - 60000;
        this.blinkTimestamps = this.blinkTimestamps.filter((t) => t > oneMinAgo);
        return this.blinkTimestamps.length;
    }

    getTotalBlinks()    { return this.totalBlinks; }
    getThreshold()      { return this.threshold; }
    getLastConfidence() { return this.lastConfidence; }
    isCalibrated()      { return this.calibrated; }

    /** Average confidence of last N blinks */
    getAvgConfidence(n = 10) {
        const recent = this.blinkConfidences.slice(-n);
        if (!recent.length) return 0;
        return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
    }
}

/**
 * Initialize MediaPipe FaceMesh with higher accuracy settings.
 */
export async function initFaceDetection(videoEl, onResults) {
    const { FaceMesh } = await import("@mediapipe/face_mesh");
    const { Camera }   = await import("@mediapipe/camera_utils");

    const faceMesh = new FaceMesh({
        locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
        maxNumFaces:            1,
        refineLandmarks:        true,    // enables iris tracking
        minDetectionConfidence: 0.65,    // ↑ from 0.6 — more accurate face detection
        minTrackingConfidence:  0.65,    // ↑ from 0.6 — fewer false re-detections
    });

    faceMesh.onResults(onResults);

    const camera = new Camera(videoEl, {
        onFrame: async () => {
            await faceMesh.send({ image: videoEl });
        },
        width:  640,
        height: 480,
    });

    await camera.start();

    return () => {
        camera.stop();
        faceMesh.close();
    };
}

/**
 * Draw face landmarks on a canvas.
 */
export function drawLandmarks(ctx, landmarks, width, height) {
    ctx.clearRect(0, 0, width, height);
    if (!landmarks || landmarks.length === 0) return;

    const faceOval = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
        378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
        162, 21, 54, 103, 67, 109, 10,
    ];

    ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    faceOval.forEach((idx, i) => {
        if (!landmarks[idx]) return;
        const x = landmarks[idx].x * width;
        const y = landmarks[idx].y * height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Eye outlines
    const leftEyeIdxs  = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33];
    const rightEyeIdxs = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362];

    [leftEyeIdxs, rightEyeIdxs].forEach((eyeIdxs) => {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        eyeIdxs.forEach((idx, i) => {
            if (!landmarks[idx]) return;
            const x = landmarks[idx].x * width;
            const y = landmarks[idx].y * height;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    });

    // Lip outline
    const lips = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61];
    ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
    ctx.lineWidth   = 1;
    ctx.beginPath();
    lips.forEach((idx, i) => {
        if (!landmarks[idx]) return;
        const x = landmarks[idx].x * width;
        const y = landmarks[idx].y * height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Iris points
    ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
    [468, 469, 470, 471, 472, 473, 474, 475, 476, 477].forEach((idx) => {
        if (!landmarks[idx]) return;
        ctx.beginPath();
        ctx.arc(landmarks[idx].x * width, landmarks[idx].y * height, 2.5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Eyebrow reference
    const leftBrow  = [70, 63, 105, 66, 107];
    const rightBrow = [300, 293, 334, 296, 336];
    [leftBrow, rightBrow].forEach((brow) => {
        ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
        ctx.lineWidth   = 1;
        ctx.beginPath();
        brow.forEach((idx, i) => {
            if (!landmarks[idx]) return;
            const x = landmarks[idx].x * width;
            const y = landmarks[idx].y * height;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    });

    // All landmark dots (subtle)
    ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
    landmarks.forEach((pt, i) => {
        if (i >= 468) return;
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 0.6, 0, Math.PI * 2);
        ctx.fill();
    });
}
