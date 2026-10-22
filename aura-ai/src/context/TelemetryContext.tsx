/**
 * AURA AI - Telemetry Context
 * Enterprise-Grade State Management for Real-Time Sensor Data
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type {
  TelemetryState,
  FacialLandmarks,
  EyeMetrics,
  BlinkEvent,
  GazeData,
  HeadPose,
  PostureData,
  TypingMetrics,
  MouseMetrics,
  SensorQuality,
  BaselineProfile,
} from '../types/telemetry';

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

interface TelemetryContextValue extends TelemetryState {
  // Setters for vision data
  setFaceLandmarks: (landmarks: FacialLandmarks | null) => void;
  setEyeMetrics: (metrics: EyeMetrics | null) => void;
  addBlinkEvent: (event: BlinkEvent) => void;
  setGazeData: (gaze: GazeData | null) => void;
  setHeadPose: (pose: HeadPose | null) => void;
  setPostureData: (posture: PostureData | null) => void;
  
  // Setters for interaction data
  setTypingMetrics: (metrics: TypingMetrics | null) => void;
  setMouseMetrics: (metrics: MouseMetrics | null) => void;
  
  // Setters for quality and calibration
  setSensorQuality: (quality: SensorQuality) => void;
  setBaselineProfile: (profile: BaselineProfile | null) => void;
  setIsCalibrating: (calibrating: boolean) => void;
  setCalibrationProgress: (progress: number) => void;
  
  // Session control
  startSession: () => void;
  endSession: () => void;
  
  // Utility
  clearBlinkEvents: () => void;
  resetTelemetry: () => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialSensorQuality: SensorQuality = {
  faceDetection: 0,
  eyeTracking: 0,
  typingSignal: 0,
  mouseSignal: 0,
  overallQuality: 0,
  timestamp: Date.now(),
};

const initialState: TelemetryState = {
  faceLandmarks: null,
  eyeMetrics: null,
  blinkEvents: [],
  gazeData: null,
  headPose: null,
  postureData: null,
  typingMetrics: null,
  mouseMetrics: null,
  sensorQuality: initialSensorQuality,
  baselineProfile: null,
  isCalibrating: false,
  calibrationProgress: 0,
  sessionId: '',
  sessionStart: 0,
  isActive: false,
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  // State
  const [faceLandmarks, setFaceLandmarks] = useState<FacialLandmarks | null>(null);
  const [eyeMetrics, setEyeMetrics] = useState<EyeMetrics | null>(null);
  const [blinkEvents, setBlinkEvents] = useState<BlinkEvent[]>([]);
  const [gazeData, setGazeData] = useState<GazeData | null>(null);
  const [headPose, setHeadPose] = useState<HeadPose | null>(null);
  const [postureData, setPostureData] = useState<PostureData | null>(null);
  
  const [typingMetrics, setTypingMetrics] = useState<TypingMetrics | null>(null);
  const [mouseMetrics, setMouseMetrics] = useState<MouseMetrics | null>(null);
  
  const [sensorQuality, setSensorQuality] = useState<SensorQuality>(initialSensorQuality);
  const [baselineProfile, setBaselineProfile] = useState<BaselineProfile | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  
  const [sessionId, setSessionId] = useState('');
  const [sessionStart, setSessionStart] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  // Refs for performance
  const blinkEventsRef = useRef<BlinkEvent[]>([]);
  
  // ========================================================================
  // BLINK EVENT MANAGEMENT
  // ========================================================================
  
  const addBlinkEvent = useCallback((event: BlinkEvent) => {
    blinkEventsRef.current.push(event);
    
    // Keep only last 100 blinks
    if (blinkEventsRef.current.length > 100) {
      blinkEventsRef.current = blinkEventsRef.current.slice(-100);
    }
    
    setBlinkEvents([...blinkEventsRef.current]);
  }, []);
  
  const clearBlinkEvents = useCallback(() => {
    blinkEventsRef.current = [];
    setBlinkEvents([]);
  }, []);
  
  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================
  
  const startSession = useCallback(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setSessionStart(Date.now());
    setIsActive(true);
  }, []);
  
  const endSession = useCallback(() => {
    setIsActive(false);
  }, []);
  
  // ========================================================================
  // RESET
  // ========================================================================
  
  const resetTelemetry = useCallback(() => {
    setFaceLandmarks(null);
    setEyeMetrics(null);
    setBlinkEvents([]);
    setGazeData(null);
    setHeadPose(null);
    setPostureData(null);
    setTypingMetrics(null);
    setMouseMetrics(null);
    setSensorQuality(initialSensorQuality);
    setBaselineProfile(null);
    setIsCalibrating(false);
    setCalibrationProgress(0);
    setSessionId('');
    setSessionStart(0);
    setIsActive(false);
    blinkEventsRef.current = [];
  }, []);
  
  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================
  
  const value: TelemetryContextValue = {
    // State
    faceLandmarks,
    eyeMetrics,
    blinkEvents,
    gazeData,
    headPose,
    postureData,
    typingMetrics,
    mouseMetrics,
    sensorQuality,
    baselineProfile,
    isCalibrating,
    calibrationProgress,
    sessionId,
    sessionStart,
    isActive,
    
    // Setters
    setFaceLandmarks,
    setEyeMetrics,
    addBlinkEvent,
    setGazeData,
    setHeadPose,
    setPostureData,
    setTypingMetrics,
    setMouseMetrics,
    setSensorQuality,
    setBaselineProfile,
    setIsCalibrating,
    setCalibrationProgress,
    
    // Session
    startSession,
    endSession,
    
    // Utility
    clearBlinkEvents,
    resetTelemetry,
  };
  
  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useTelemetry(): TelemetryContextValue {
  const context = useContext(TelemetryContext);
  
  if (!context) {
    throw new Error('useTelemetry must be used within TelemetryProvider');
  }
  
  return context;
}
