/**
 * AURA AI - Computer Vision Engine
 * MediaPipe FaceMesh Integration with Enterprise-Grade Reliability
 */

import type { FacialLandmarks, EyeMetrics, HeadPose, PostureData } from '../types/telemetry';

// ============================================================================
// EYE LANDMARK INDICES (MediaPipe FaceMesh 468-point model)
// ============================================================================

const LEFT_EYE_INDICES = {
  top: [159, 158],
  bottom: [145, 153],
  outer: 33,
  inner: 133,
  iris: [468, 469, 470, 471, 472],
};

const RIGHT_EYE_INDICES = {
  top: [386, 385],
  bottom: [374, 380],
  outer: 362,
  inner: 263,
  iris: [473, 474, 475, 476, 477],
};

// Head pose reference points
const NOSE_TIP = 1;
const CHIN = 152;
const LEFT_EYE_CORNER = 33;
const RIGHT_EYE_CORNER = 263;
const LEFT_MOUTH = 61;
const RIGHT_MOUTH = 291;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function euclideanDistance(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ============================================================================
// EYE ASPECT RATIO (EAR) CALCULATION
// ============================================================================

export function calculateEAR(
  landmarks: Array<{ x: number; y: number; z: number }>
): EyeMetrics {
  const leftEAR = calculateSingleEyeEAR(landmarks, LEFT_EYE_INDICES);
  const rightEAR = calculateSingleEyeEAR(landmarks, RIGHT_EYE_INDICES);
  
  // Calculate confidence based on landmark stability
  const confidence = calculateEyeConfidence(landmarks);
  
  return {
    leftEAR,
    rightEAR,
    averageEAR: (leftEAR + rightEAR) / 2,
    timestamp: Date.now(),
    confidence,
  };
}

function calculateSingleEyeEAR(
  landmarks: Array<{ x: number; y: number; z: number }>,
  eyeIndices: typeof LEFT_EYE_INDICES
): number {
  // Vertical distances
  const v1 = euclideanDistance(
    landmarks[eyeIndices.top[0]],
    landmarks[eyeIndices.bottom[0]]
  );
  const v2 = euclideanDistance(
    landmarks[eyeIndices.top[1]],
    landmarks[eyeIndices.bottom[1]]
  );
  
  // Horizontal distance
  const h = euclideanDistance(
    landmarks[eyeIndices.outer],
    landmarks[eyeIndices.inner]
  );
  
  // EAR formula: (v1 + v2) / (2 * h)
  if (h === 0) return 0.3; // Default open eye value
  
  return (v1 + v2) / (2 * h);
}

function calculateEyeConfidence(
  landmarks: Array<{ x: number; y: number; z: number }>
): number {
  // Check if eye landmarks are within reasonable bounds
  const leftEyePoints = [
    ...LEFT_EYE_INDICES.top,
    ...LEFT_EYE_INDICES.bottom,
    LEFT_EYE_INDICES.outer,
    LEFT_EYE_INDICES.inner,
  ];
  
  const rightEyePoints = [
    ...RIGHT_EYE_INDICES.top,
    ...RIGHT_EYE_INDICES.bottom,
    RIGHT_EYE_INDICES.outer,
    RIGHT_EYE_INDICES.inner,
  ];
  
  let validPoints = 0;
  const allPoints = [...leftEyePoints, ...rightEyePoints];
  
  for (const idx of allPoints) {
    const point = landmarks[idx];
    if (point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1) {
      validPoints++;
    }
  }
  
  return validPoints / allPoints.length;
}

// ============================================================================
// HEAD POSE ESTIMATION
// ============================================================================

export function estimateHeadPose(
  landmarks: Array<{ x: number; y: number; z: number }>
): HeadPose {
  const noseTip = landmarks[NOSE_TIP];
  const chin = landmarks[CHIN];
  const leftEye = landmarks[LEFT_EYE_CORNER];
  const rightEye = landmarks[RIGHT_EYE_CORNER];
  const leftMouth = landmarks[LEFT_MOUTH];
  const rightMouth = landmarks[RIGHT_MOUTH];
  
  // Calculate pitch (up/down tilt)
  const noseToChainDist = euclideanDistance(noseTip, chin);
  const pitch = Math.atan2(chin.y - noseTip.y, noseToChainDist) * (180 / Math.PI);
  
  // Calculate yaw (left/right rotation)
  const eyeCenter = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
    z: (leftEye.z + rightEye.z) / 2,
  };
  const yaw = Math.atan2(noseTip.x - eyeCenter.x, noseTip.z - eyeCenter.z) * (180 / Math.PI);
  
  // Calculate roll (head tilt)
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
  
  // Calculate confidence based on landmark quality
  const confidence = calculatePoseConfidence(landmarks);
  
  return {
    pitch: clamp(pitch, -90, 90),
    yaw: clamp(yaw, -90, 90),
    roll: clamp(roll, -45, 45),
    timestamp: Date.now(),
    confidence,
  };
}

function calculatePoseConfidence(
  landmarks: Array<{ x: number; y: number; z: number }>
): number {
  const keyPoints = [NOSE_TIP, CHIN, LEFT_EYE_CORNER, RIGHT_EYE_CORNER, LEFT_MOUTH, RIGHT_MOUTH];
  let validPoints = 0;
  
  for (const idx of keyPoints) {
    const point = landmarks[idx];
    if (point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1) {
      validPoints++;
    }
  }
  
  return validPoints / keyPoints.length;
}

// ============================================================================
// POSTURE ESTIMATION
// ============================================================================

export function estimatePosture(
  landmarks: Array<{ x: number; y: number; z: number }>,
  frameWidth: number,
  frameHeight: number
): PostureData {
  const leftEye = landmarks[LEFT_EYE_CORNER];
  const rightEye = landmarks[RIGHT_EYE_CORNER];
  const noseTip = landmarks[NOSE_TIP];
  const chin = landmarks[CHIN];
  
  // Shoulder alignment (based on eye level)
  const eyeLevel = Math.abs(leftEye.y - rightEye.y);
  const shoulderAlignment = 1 - Math.min(eyeLevel * 10, 1); // 0-1, higher is better
  
  // Neck angle (based on nose-to-chin angle)
  const neckAngle = Math.atan2(chin.y - noseTip.y, chin.x - noseTip.x) * (180 / Math.PI);
  
  // Face distance (based on eye separation - closer face = larger separation)
  const eyeSeparation = euclideanDistance(leftEye, rightEye);
  const faceDistance = clamp(eyeSeparation * 5, 0, 1); // Normalized 0-1
  
  const confidence = calculatePostureConfidence(landmarks);
  
  return {
    shoulderAlignment,
    neckAngle: clamp(neckAngle, -45, 45),
    faceDistance,
    timestamp: Date.now(),
    confidence,
  };
}

function calculatePostureConfidence(
  landmarks: Array<{ x: number; y: number; z: number }>
): number {
  // Check if key facial landmarks are visible and stable
  const keyPoints = [LEFT_EYE_CORNER, RIGHT_EYE_CORNER, NOSE_TIP, CHIN];
  let validPoints = 0;
  
  for (const idx of keyPoints) {
    const point = landmarks[idx];
    if (point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1) {
      validPoints++;
    }
  }
  
  return validPoints / keyPoints.length;
}

// ============================================================================
// GAZE ESTIMATION (Simplified - using iris position)
// ============================================================================

export function estimateGaze(
  landmarks: Array<{ x: number; y: number; z: number }>
): { x: number; y: number; confidence: number } {
  // Get iris centers
  const leftIrisCenter = calculateIrisCenter(landmarks, LEFT_EYE_INDICES.iris);
  const rightIrisCenter = calculateIrisCenter(landmarks, RIGHT_EYE_INDICES.iris);
  
  if (!leftIrisCenter || !rightIrisCenter) {
    return { x: 0, y: 0, confidence: 0 };
  }
  
  // Get eye corners for reference
  const leftEyeOuter = landmarks[LEFT_EYE_INDICES.outer];
  const leftEyeInner = landmarks[LEFT_EYE_INDICES.inner];
  const rightEyeOuter = landmarks[RIGHT_EYE_INDICES.outer];
  const rightEyeInner = landmarks[RIGHT_EYE_INDICES.inner];
  
  // Calculate gaze direction (normalized -1 to 1)
  const leftGazeX = (leftIrisCenter.x - (leftEyeOuter.x + leftEyeInner.x) / 2) * 10;
  const rightGazeX = (rightIrisCenter.x - (rightEyeOuter.x + rightEyeInner.x) / 2) * 10;
  
  const gazeX = clamp((leftGazeX + rightGazeX) / 2, -1, 1);
  const gazeY = clamp((leftIrisCenter.y + rightIrisCenter.y) / 2 - 0.5, -1, 1);
  
  const confidence = 0.8; // Simplified confidence
  
  return { x: gazeX, y: gazeY, confidence };
}

function calculateIrisCenter(
  landmarks: Array<{ x: number; y: number; z: number }>,
  irisIndices: number[]
): { x: number; y: number } | null {
  if (irisIndices.length === 0) return null;
  
  let sumX = 0;
  let sumY = 0;
  let validCount = 0;
  
  for (const idx of irisIndices) {
    const point = landmarks[idx];
    if (point) {
      sumX += point.x;
      sumY += point.y;
      validCount++;
    }
  }
  
  if (validCount === 0) return null;
  
  return {
    x: sumX / validCount,
    y: sumY / validCount,
  };
}

// ============================================================================
// EXPONENTIAL MOVING AVERAGE SMOOTHER
// ============================================================================

export class EARSmoother {
  private smoothedValue: number | null = null;
  private alpha: number;
  
  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }
  
  update(rawValue: number): number {
    if (this.smoothedValue === null) {
      this.smoothedValue = rawValue;
    } else {
      this.smoothedValue = this.alpha * rawValue + (1 - this.alpha) * this.smoothedValue;
    }
    return this.smoothedValue;
  }
  
  reset(): void {
    this.smoothedValue = null;
  }
  
  getValue(): number {
    return this.smoothedValue || 0.3;
  }
}

// ============================================================================
// ADAPTIVE BLINK DETECTOR
// ============================================================================

export class AdaptiveBlinkDetector {
  private threshold: number;
  private minFrames: number;
  private maxFrames: number;
  private belowThresholdCount: number = 0;
  private earHistory: number[] = [];
  private calibrated: boolean = false;
  private readonly calibrationSamples: number = 60;
  
  constructor(
    initialThreshold: number = 0.2,
    minFrames: number = 2,
    maxFrames: number = 8
  ) {
    this.threshold = initialThreshold;
    this.minFrames = minFrames;
    this.maxFrames = maxFrames;
  }
  
  update(ear: number): { blinked: boolean; confidence: number } {
    // Add to history for calibration
    this.earHistory.push(ear);
    if (this.earHistory.length > 100) {
      this.earHistory.shift();
    }
    
    // Calibrate threshold after collecting enough samples
    if (!this.calibrated && this.earHistory.length >= this.calibrationSamples) {
      this.calibrateThreshold();
    }
    
    // Detect blink
    let blinked = false;
    
    if (ear < this.threshold) {
      this.belowThresholdCount++;
    } else {
      if (
        this.belowThresholdCount >= this.minFrames &&
        this.belowThresholdCount <= this.maxFrames
      ) {
        blinked = true;
      }
      this.belowThresholdCount = 0;
    }
    
    const confidence = this.calibrated ? 0.9 : 0.5;
    
    return { blinked, confidence };
  }
  
  private calibrateThreshold(): void {
    // Calculate median EAR from history
    const sorted = [...this.earHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Set threshold to 75% of median (open eye baseline)
    this.threshold = Math.max(0.15, Math.min(0.25, median * 0.75));
    this.calibrated = true;
  }
  
  getThreshold(): number {
    return this.threshold;
  }
  
  isCalibrated(): boolean {
    return this.calibrated;
  }
  
  reset(): void {
    this.earHistory = [];
    this.calibrated = false;
    this.belowThresholdCount = 0;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// FACE DETECTION QUALITY SCORER
// ============================================================================

export function calculateFaceQuality(
  landmarks: Array<{ x: number; y: number; z: number }>,
  frameWidth: number,
  frameHeight: number
): number {
  if (!landmarks || landmarks.length < 468) {
    return 0;
  }
  
  // Check landmark distribution
  let validLandmarks = 0;
  for (const point of landmarks) {
    if (point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1) {
      validLandmarks++;
    }
  }
  
  const landmarkQuality = validLandmarks / landmarks.length;
  
  // Check face size (should be reasonable portion of frame)
  const leftEye = landmarks[LEFT_EYE_CORNER];
  const rightEye = landmarks[RIGHT_EYE_CORNER];
  const eyeSeparation = euclideanDistance(leftEye, rightEye);
  
  // Ideal eye separation is 15-30% of frame width
  const sizeQuality = eyeSeparation >= 0.15 && eyeSeparation <= 0.30 ? 1.0 : 0.5;
  
  // Check face centering
  const noseTip = landmarks[NOSE_TIP];
  const centeringQuality = 1 - Math.abs(noseTip.x - 0.5) * 2;
  
  // Combined quality score
  return (landmarkQuality * 0.5 + sizeQuality * 0.3 + centeringQuality * 0.2);
}
