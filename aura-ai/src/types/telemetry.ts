/**
 * AURA AI - Phase 1: Human Telemetry & Behavioral Intelligence Foundation
 * Enterprise-Grade Type Definitions
 */

// ============================================================================
// SENSOR DATA TYPES
// ============================================================================

export interface FacialLandmarks {
  landmarks: Array<{ x: number; y: number; z: number }>;
  timestamp: number;
  confidence: number;
}

export interface EyeMetrics {
  leftEAR: number;
  rightEAR: number;
  averageEAR: number;
  timestamp: number;
  confidence: number;
}

export interface BlinkEvent {
  timestamp: number;
  duration: number; // frames
  earAtBlink: number;
}

export interface GazeData {
  x: number; // normalized -1 to 1
  y: number; // normalized -1 to 1
  confidence: number;
  timestamp: number;
}

export interface HeadPose {
  pitch: number; // degrees
  yaw: number; // degrees
  roll: number; // degrees
  timestamp: number;
  confidence: number;
}

export interface PostureData {
  shoulderAlignment: number; // 0-1
  neckAngle: number; // degrees
  faceDistance: number; // normalized
  timestamp: number;
  confidence: number;
}

// ============================================================================
// TYPING TELEMETRY
// ============================================================================

export interface KeystrokeEvent {
  key: string;
  timestamp: number;
  interval: number; // ms since last keystroke
  isCorrection: boolean;
}

export interface TypingMetrics {
  wpm: number;
  averageInterval: number;
  hesitationCount: number;
  correctionFrequency: number;
  burstCount: number;
  timestamp: number;
  confidence: number;
}

// ============================================================================
// MOUSE TELEMETRY
// ============================================================================

export interface MouseEvent {
  x: number;
  y: number;
  timestamp: number;
  eventType: 'move' | 'click' | 'scroll';
}

export interface MouseMetrics {
  velocity: number; // px/s
  acceleration: number; // px/s²
  clickDensity: number; // clicks per minute
  movementEntropy: number; // 0-1
  idleTime: number; // ms
  rageClickCount: number;
  hoverInstability: number; // 0-1
  timestamp: number;
  confidence: number;
}

// ============================================================================
// CALIBRATION PROFILES
// ============================================================================

export interface BaselineProfile {
  userId: string;
  createdAt: number;
  calibrationDuration: number; // ms
  sampleCount: number;
  
  // Blink baseline
  blinkNorm: {
    meanRate: number; // blinks per minute
    stdDev: number;
    threshold: number;
  };
  
  // Typing baseline
  typingNorm: {
    meanWPM: number;
    stdDev: number;
    meanInterval: number;
    correctionRate: number;
  };
  
  // Mouse baseline
  mouseNorm: {
    meanVelocity: number;
    stdDev: number;
    meanClickDensity: number;
    idleThreshold: number;
  };
  
  // Posture baseline
  postureNorm: {
    meanNeckAngle: number;
    stdDev: number;
    meanDistance: number;
  };
  
  // Gaze baseline
  gazeNorm: {
    meanFixationDuration: number;
    stdDev: number;
    saccadeFrequency: number;
  };
  
  confidence: number; // 0-1
}

// ============================================================================
// TELEMETRY BUFFERS
// ============================================================================

export interface TelemetryBuffer<T> {
  data: T[];
  maxSize: number;
  windowMs: number;
  lastCleanup: number;
}

export interface SensorQuality {
  faceDetection: number; // 0-1
  eyeTracking: number; // 0-1
  typingSignal: number; // 0-1
  mouseSignal: number; // 0-1
  overallQuality: number; // 0-1
  timestamp: number;
}

// ============================================================================
// REALTIME TELEMETRY STATE
// ============================================================================

export interface TelemetryState {
  // Vision sensors
  faceLandmarks: FacialLandmarks | null;
  eyeMetrics: EyeMetrics | null;
  blinkEvents: BlinkEvent[];
  gazeData: GazeData | null;
  headPose: HeadPose | null;
  postureData: PostureData | null;
  
  // Interaction sensors
  typingMetrics: TypingMetrics | null;
  mouseMetrics: MouseMetrics | null;
  
  // Quality metrics
  sensorQuality: SensorQuality;
  
  // Calibration
  baselineProfile: BaselineProfile | null;
  isCalibrating: boolean;
  calibrationProgress: number; // 0-1
  
  // Session
  sessionId: string;
  sessionStart: number;
  isActive: boolean;
}

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export type TelemetryMessage =
  | { type: 'FACE_LANDMARKS'; payload: FacialLandmarks }
  | { type: 'EYE_METRICS'; payload: EyeMetrics }
  | { type: 'BLINK_EVENT'; payload: BlinkEvent }
  | { type: 'GAZE_DATA'; payload: GazeData }
  | { type: 'HEAD_POSE'; payload: HeadPose }
  | { type: 'POSTURE_DATA'; payload: PostureData }
  | { type: 'TYPING_METRICS'; payload: TypingMetrics }
  | { type: 'MOUSE_METRICS'; payload: MouseMetrics }
  | { type: 'SENSOR_QUALITY'; payload: SensorQuality }
  | { type: 'CALIBRATION_UPDATE'; payload: { progress: number; profile: Partial<BaselineProfile> } }
  | { type: 'SESSION_START'; payload: { sessionId: string; timestamp: number } }
  | { type: 'SESSION_END'; payload: { sessionId: string; timestamp: number } };

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SensorConfig {
  vision: {
    targetFPS: number;
    minConfidence: number;
    smoothingFactor: number;
    calibrationSamples: number;
  };
  typing: {
    windowMs: number;
    minSamplesForMetrics: number;
    burstThresholdMs: number;
  };
  mouse: {
    windowMs: number;
    idleThresholdMs: number;
    rageClickThresholdMs: number;
  };
  telemetry: {
    bufferSize: number;
    transmissionIntervalMs: number;
  };
}

export const DEFAULT_SENSOR_CONFIG: SensorConfig = {
  vision: {
    targetFPS: 30,
    minConfidence: 0.6,
    smoothingFactor: 0.3,
    calibrationSamples: 300, // 10 seconds at 30 FPS
  },
  typing: {
    windowMs: 15000,
    minSamplesForMetrics: 10,
    burstThresholdMs: 200,
  },
  mouse: {
    windowMs: 10000,
    idleThresholdMs: 2000,
    rageClickThresholdMs: 300,
  },
  telemetry: {
    bufferSize: 1000,
    transmissionIntervalMs: 100,
  },
};
