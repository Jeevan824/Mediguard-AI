/**
 * Driver Safety Engine — JavaScript port of Driver-Safety-Monitor-main Python models.
 *
 * Ports:
 *   core/face_monitor.py    → FaceMonitor class
 *   core/analytics_engine.py→ AnalyticsEngine class
 *   core/alert_manager.py   → AlertManager class
 *
 * Thresholds mirror config/settings.json exactly.
 * Consumes MediaPipe FaceMesh landmarks (478-point model via @mediapipe/face_mesh).
 *
 * Data Flow (mirrors main.py):
 *   webcam frame → FaceMonitor.detect(landmarks, timestamp)
 *               → AlertManager.processAlerts(faceData, gestureData)
 *               → AnalyticsEngine.update(faceData, alertData)
 *               → AnalyticsEngine.getSessionSummary()  // feeds SensorContext + AuraContext
 */

// ─── Default thresholds — mirror of config/settings.json ─────────────────────
export const DEFAULT_THRESHOLDS = {
    ear_threshold:         0.25,
    mar_threshold:         0.50,
    yaw_threshold_degrees: 15.0,
    min_blink_time:        0.04,
    max_blink_time:        0.70,
    sleep_time:            4.0,
    drowsy_time:           1.0,
    yawn_time:             3.0,
    inattention_time:      4.0,
    sos_hold_time:         5.0,
    sos_cooldown:          300.0,
    sleepy_window:         30.0,
    sleepy_blink_count:    4,
    long_blink_min:        0.40,
    long_blink_max:        1.50,
};

export const DEFAULT_FATIGUE_WEIGHTS = {
    drowsy_events:    30,
    yawn_count:       10,
    attention_lapses: 15,
    long_blinks:       5,
    low_blink_rate:   10,
};

// ─── MediaPipe FaceMesh landmark indices (match face_monitor.py exactly) ──────
const LEFT_EYE_IDX  = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380];
const MOUTH_UPPER   = 13;
const MOUTH_LOWER   = 14;
const MOUTH_LEFT    = 61;
const MOUTH_RIGHT   = 291;

// ─── Utility ─────────────────────────────────────────────────────────────────
function dist2D(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// ─── EAR Calculation — identical formula to face_monitor.py ──────────────────
function computeEAR(landmarks, indices) {
    const pts = indices.map(i => landmarks[i]);
    if (pts.some(p => !p)) return 0.3;
    const A = dist2D(pts[1], pts[5]);
    const B = dist2D(pts[2], pts[4]);
    const C = dist2D(pts[0], pts[3]);
    if (C === 0) return 0.0;
    return (A + B) / (2.0 * C);
}

// ─── MAR Calculation — identical formula to face_monitor.py ──────────────────
function computeMAR(landmarks) {
    const upper = landmarks[MOUTH_UPPER];
    const lower = landmarks[MOUTH_LOWER];
    const left  = landmarks[MOUTH_LEFT];
    const right = landmarks[MOUTH_RIGHT];
    if (!upper || !lower || !left || !right) return 0.0;
    const vertical   = dist2D(upper, lower);
    const horizontal = dist2D(left, right);
    if (horizontal === 0) return 0.0;
    return vertical / horizontal;
}

// ─── Yaw estimation (JS approximation of Python PnP solver) ──────────────────
function estimateYaw(landmarks) {
    const nose  = landmarks[1];
    const left  = landmarks[234];
    const right = landmarks[454];
    if (!nose || !left || !right) return 0;
    const faceWidth = dist2D(left, right);
    if (faceWidth === 0) return 0;
    const centerX   = (left.x + right.x) / 2;
    const yawOffset = (nose.x - centerX) / (faceWidth / 2);
    return yawOffset * 45; // degrees estimate
}

// ─── Rolling buffer ───────────────────────────────────────────────────────────
class RollingBuffer {
    constructor(maxLen) { this.maxLen = maxLen; this.buf = []; }
    push(item) {
        this.buf.push(item);
        if (this.buf.length > this.maxLen) this.buf.shift();
    }
    get()    { return this.buf; }
    length() { return this.buf.length; }
    clear()  { this.buf = []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FaceMonitor — Port of core/face_monitor.py
// ─────────────────────────────────────────────────────────────────────────────
export class FaceMonitor {
    constructor(thresholds = {}) {
        this.thresholds       = { ...DEFAULT_THRESHOLDS, ...thresholds };
        this.earHistory       = new RollingBuffer(300);
        this.longBlinkTimes   = [];
        this.blinkCount       = 0;
        this.closedStartTime  = null;
        this.isClosed         = false;
        this.mouthOpenStartTime = null;
        this.headAwayStartTime  = null;
        this.noFaceStartTime    = null;
        this.sleepDetected    = false;
        this.sleepyDetected   = false;
        this.yawnDetected     = false;
        this.focusAlert       = false;
    }

    /**
     * Process one frame of MediaPipe FaceMesh normalized landmarks.
     * @param {Array|null} landmarks - Array of {x,y,z} (468+ points)
     * @param {number} timestamp     - Current time in seconds
     * @returns {Object} face_data   - Same shape as Python face_monitor.py output
     */
    detect(landmarks, timestamp) {
        const t = timestamp;
        const detectionData = {
            face_detected:   false,
            avg_ear:         0.0,
            mar:             0.0,
            yaw:             0.0,
            blink_detected:  false,
            blink_duration:  0.0,
            is_closed:       false,
            sleep_detected:  false,
            sleepy_detected: false,
            yawn_detected:   false,
            focus_alert:     false,
            blink_count:     this.blinkCount,
            ear_history:     [],
        };

        if (landmarks && landmarks.length >= 468) {
            detectionData.face_detected = true;
            this.noFaceStartTime        = null;

            const leftEAR  = computeEAR(landmarks, LEFT_EYE_IDX);
            const rightEAR = computeEAR(landmarks, RIGHT_EYE_IDX);
            const avgEAR   = (leftEAR + rightEAR) / 2.0;
            detectionData.avg_ear = avgEAR;
            this.earHistory.push({ t, ear: avgEAR });

            const mar = computeMAR(landmarks);
            detectionData.mar = mar;

            const yaw = estimateYaw(landmarks);
            detectionData.yaw = yaw;

            this._updateEyeState(avgEAR, t, detectionData);
            this._updateYawnState(mar, t, detectionData);
            this._updateAttentionState(yaw, t, detectionData);
        } else {
            this.earHistory.push({ t, ear: 0.0 });
            this._handleNoFace(t, detectionData);
        }

        detectionData.sleep_detected  = this.sleepDetected;
        detectionData.sleepy_detected = this.sleepyDetected;
        detectionData.ear_history     = this.earHistory.get().slice(-90);
        detectionData.blink_count     = this.blinkCount;
        return detectionData;
    }

    _updateEyeState(ear, t, data) {
        const thr = this.thresholds;
        if (ear < thr.ear_threshold) {
            if (!this.isClosed) { this.closedStartTime = t; this.isClosed = true; }
            if (t - this.closedStartTime >= thr.sleep_time) this.sleepDetected = true;
        } else {
            if (this.isClosed) {
                const duration       = t - (this.closedStartTime || t);
                this.isClosed        = false;
                this.sleepDetected   = false;
                this.closedStartTime = null;
                if (duration >= thr.min_blink_time && duration <= thr.max_blink_time) {
                    this.blinkCount++;
                    data.blink_detected = true;
                    data.blink_duration = duration;
                    if (duration >= thr.long_blink_min && duration <= thr.long_blink_max) {
                        this.longBlinkTimes.push(t);
                    }
                }
            }
        }
        data.is_closed = this.isClosed;
        this.longBlinkTimes = this.longBlinkTimes.filter(bt => t - bt <= thr.sleepy_window);
        this.sleepyDetected = this.longBlinkTimes.length >= thr.sleepy_blink_count;
    }

    _updateYawnState(mar, t, data) {
        const thr = this.thresholds;
        if (mar > thr.mar_threshold) {
            if (this.mouthOpenStartTime === null) this.mouthOpenStartTime = t;
            else if (t - this.mouthOpenStartTime >= thr.yawn_time) this.yawnDetected = true;
        } else {
            this.mouthOpenStartTime = null;
            this.yawnDetected       = false;
        }
        data.yawn_detected = this.yawnDetected;
    }

    _updateAttentionState(yaw, t, data) {
        const thr = this.thresholds;
        if (Math.abs(yaw) > thr.yaw_threshold_degrees) {
            if (this.headAwayStartTime === null) this.headAwayStartTime = t;
            else if (t - this.headAwayStartTime >= thr.inattention_time) this.focusAlert = true;
        } else {
            this.headAwayStartTime = null;
            this.focusAlert        = false;
        }
        data.focus_alert = this.focusAlert;
    }

    _handleNoFace(t, data) {
        const thr = this.thresholds;
        if (this.noFaceStartTime === null) this.noFaceStartTime = t;
        else if (t - this.noFaceStartTime >= thr.inattention_time) this.focusAlert = true;
        data.focus_alert        = this.focusAlert;
        this.isClosed           = false;
        this.mouthOpenStartTime = null;
        this.headAwayStartTime  = null;
    }

    reset() {
        this.earHistory.clear();
        this.longBlinkTimes     = [];
        this.blinkCount         = 0;
        this.closedStartTime    = null;
        this.isClosed           = false;
        this.mouthOpenStartTime = null;
        this.headAwayStartTime  = null;
        this.noFaceStartTime    = null;
        this.sleepDetected      = false;
        this.sleepyDetected     = false;
        this.yawnDetected       = false;
        this.focusAlert         = false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AlertManager — Port of core/alert_manager.py
// ─────────────────────────────────────────────────────────────────────────────
const ALERT_PRIORITY = {
    SOS_TRIGGERED:   5,
    SLEEP_DETECTED:  4,
    FOCUS_ALERT:     3,
    SLEEPY_DETECTED: 2,
    YAWN_DETECTED:   1,
};

const ALERT_MESSAGES = {
    SOS_TRIGGERED:   'SOS ALERT — Emergency Signal Sent',
    SLEEP_DETECTED:  'DROWSINESS ALERT — Pull Over Safely',
    FOCUS_ALERT:     'ATTENTION — Keep Eyes on Road',
    SLEEPY_DETECTED: 'FATIGUE DETECTED — Take a Break',
    YAWN_DETECTED:   'YAWN DETECTED — Consider Resting',
};

const ALERT_COLORS = {
    SOS_TRIGGERED:   '#a78bfa',
    SLEEP_DETECTED:  '#ef4444',
    FOCUS_ALERT:     '#f97316',
    SLEEPY_DETECTED: '#f59e0b',
    YAWN_DETECTED:   '#eab308',
};

export class AlertManager {
    constructor() {
        this.alertHistory  = [];
        this.lastAlertTime = 0;
        this.alertCooldown = 2.0;
    }

    processAlerts(faceData, gestureData = {}) {
        const active = [];
        if (gestureData.sos_triggered)     active.push('SOS_TRIGGERED');
        if (faceData.sleep_detected)       active.push('SLEEP_DETECTED');
        else if (faceData.focus_alert)     active.push('FOCUS_ALERT');
        else if (faceData.sleepy_detected) active.push('SLEEPY_DETECTED');
        else if (faceData.yawn_detected)   active.push('YAWN_DETECTED');

        if (active.length === 0) return null;

        const highestAlert = active.reduce((a, b) =>
            (ALERT_PRIORITY[a] || 0) >= (ALERT_PRIORITY[b] || 0) ? a : b
        );

        this._triggerAlert(highestAlert);
        return {
            type:      highestAlert,
            message:   ALERT_MESSAGES[highestAlert] || 'ALERT',
            color:     ALERT_COLORS[highestAlert]   || '#ef4444',
            priority:  ALERT_PRIORITY[highestAlert] || 0,
            timestamp: Date.now(),
        };
    }

    _triggerAlert(alertType) {
        const nowMs = Date.now();
        const last  = this.alertHistory[this.alertHistory.length - 1];
        if (!last || last.type !== alertType || (nowMs - last.timestamp) > 5000) {
            this.alertHistory.push({
                type:      alertType,
                message:   ALERT_MESSAGES[alertType] || '',
                color:     ALERT_COLORS[alertType]   || '#ef4444',
                timestamp: nowMs,
            });
            if (this.alertHistory.length > 10) this.alertHistory.shift();
        }
    }

    getAlertHistory() { return this.alertHistory; }
    reset() { this.alertHistory = []; this.lastAlertTime = 0; }
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsEngine — Port of core/analytics_engine.py
// ─────────────────────────────────────────────────────────────────────────────
export class AnalyticsEngine {
    constructor(fatigue_weights = {}) {
        this.weights   = { ...DEFAULT_FATIGUE_WEIGHTS, ...fatigue_weights };
        this.startTime = Date.now();
        this.metrics   = {
            blink_count:      0,
            yawn_count:       0,
            drowsy_events:    0,
            attention_lapses: 0,
            long_blinks:      0,
            sos_events:       0,
        };
        this.fatigueScore = 0.0;
        // Rising-edge state tracking
        this._prevSleep = false;
        this._prevYawn  = false;
        this._prevFocus = false;
    }

    update(faceData, alertData) {
        if (faceData.blink_detected) {
            this.metrics.blink_count++;
            if ((faceData.blink_duration || 0) > 0.4) this.metrics.long_blinks++;
        }
        if (faceData.sleep_detected  && !this._prevSleep) this.metrics.drowsy_events++;
        if (faceData.yawn_detected   && !this._prevYawn)  this.metrics.yawn_count++;
        if (faceData.focus_alert     && !this._prevFocus) this.metrics.attention_lapses++;
        this._prevSleep = !!faceData.sleep_detected;
        this._prevYawn  = !!faceData.yawn_detected;
        this._prevFocus = !!faceData.focus_alert;
        if (alertData && alertData.type === 'SOS_TRIGGERED') this.metrics.sos_events++;
    }

    calculateFatigueScore() {
        const durationMinutes = Math.max(1, (Date.now() - this.startTime) / 60000);
        const w = this.weights;
        let score = (
            this.metrics.drowsy_events    * w.drowsy_events   +
            this.metrics.yawn_count       * w.yawn_count      +
            this.metrics.attention_lapses * w.attention_lapses +
            this.metrics.long_blinks      * w.long_blinks
        ) / durationMinutes;
        const blinkRate = this.metrics.blink_count / durationMinutes;
        if (blinkRate < 10) score += w.low_blink_rate;
        return Math.min(100.0, Math.max(0.0, score));
    }

    getSessionSummary() {
        const duration        = (Date.now() - this.startTime) / 1000;
        const durationMinutes = Math.max(0.001, duration / 60);
        this.fatigueScore     = this.calculateFatigueScore();
        return {
            duration_seconds:  Math.round(duration),
            blink_count:       this.metrics.blink_count,
            blink_rate:        Math.round(this.metrics.blink_count / durationMinutes * 10) / 10,
            yawn_count:        this.metrics.yawn_count,
            drowsy_events:     this.metrics.drowsy_events,
            attention_lapses:  this.metrics.attention_lapses,
            long_blinks:       this.metrics.long_blinks,
            sos_events:        this.metrics.sos_events,
            fatigue_score:     Math.round(this.fatigueScore * 10) / 10,
        };
    }

    reset() {
        this.startTime    = Date.now();
        this.fatigueScore = 0.0;
        this._prevSleep   = false;
        this._prevYawn    = false;
        this._prevFocus   = false;
        this.metrics = {
            blink_count:      0,
            yawn_count:       0,
            drowsy_events:    0,
            attention_lapses: 0,
            long_blinks:      0,
            sos_events:       0,
        };
    }
}

// ─── Color / label helpers ────────────────────────────────────────────────────
export function fatigueScoreToColor(score) {
    if (score < 20)  return '#10b981';
    if (score < 40)  return '#06b6d4';
    if (score < 60)  return '#f59e0b';
    if (score < 80)  return '#f97316';
    return '#ef4444';
}

export function fatigueScoreToLabel(score) {
    if (score < 20)  return 'SAFE';
    if (score < 40)  return 'MILD';
    if (score < 60)  return 'MODERATE';
    if (score < 80)  return 'HIGH';
    return 'CRITICAL';
}

export function alertTypeToColor(alertType) {
    return ALERT_COLORS[alertType] || '#6b7280';
}
