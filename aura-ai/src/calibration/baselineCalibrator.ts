/**
 * AURA AI - Adaptive Human Baseline Calibration Engine
 * NO HARDCODED THRESHOLDS - Every user generates their own baseline
 */

import type {
  BaselineProfile,
  EyeMetrics,
  TypingMetrics,
  MouseMetrics,
  PostureData,
  GazeData,
} from '../types/telemetry';

// ============================================================================
// CALIBRATION ENGINE
// ============================================================================

export class BaselineCalibrator {
  private userId: string;
  private calibrationStartTime: number = 0;
  private calibrationDuration: number;
  private targetSamples: number;
  
  // Data collectors
  private blinkRates: number[] = [];
  private typingWPMs: number[] = [];
  private typingIntervals: number[] = [];
  private typingCorrections: number[] = [];
  private mouseVelocities: number[] = [];
  private mouseClickDensities: number[] = [];
  private mouseIdleTimes: number[] = [];
  private neckAngles: number[] = [];
  private faceDistances: number[] = [];
  private gazeFixations: number[] = [];
  
  private isCalibrating: boolean = false;
  private sampleCount: number = 0;
  
  constructor(
    userId: string,
    calibrationDurationMs: number = 60000, // 1 minute default
    targetSamples: number = 300
  ) {
    this.userId = userId;
    this.calibrationDuration = calibrationDurationMs;
    this.targetSamples = targetSamples;
  }
  
  // ==========================================================================
  // CALIBRATION CONTROL
  // ==========================================================================
  
  startCalibration(): void {
    this.isCalibrating = true;
    this.calibrationStartTime = Date.now();
    this.reset();
  }
  
  stopCalibration(): BaselineProfile | null {
    this.isCalibrating = false;
    
    if (this.sampleCount < this.targetSamples * 0.5) {
      // Insufficient data
      return null;
    }
    
    return this.generateProfile();
  }
  
  getProgress(): number {
    if (!this.isCalibrating) return 0;
    
    const elapsed = Date.now() - this.calibrationStartTime;
    const timeProgress = Math.min(elapsed / this.calibrationDuration, 1.0);
    const sampleProgress = Math.min(this.sampleCount / this.targetSamples, 1.0);
    
    // Use whichever is further along
    return Math.max(timeProgress, sampleProgress);
  }
  
  isComplete(): boolean {
    if (!this.isCalibrating) return false;
    
    const elapsed = Date.now() - this.calibrationStartTime;
    return elapsed >= this.calibrationDuration || this.sampleCount >= this.targetSamples;
  }
  
  // ==========================================================================
  // DATA COLLECTION
  // ==========================================================================
  
  addBlinkRate(rate: number): void {
    if (!this.isCalibrating) return;
    if (rate >= 0 && rate <= 100) {
      this.blinkRates.push(rate);
      this.sampleCount++;
    }
  }
  
  addTypingMetrics(metrics: TypingMetrics): void {
    if (!this.isCalibrating) return;
    if (metrics.wpm > 0) {
      this.typingWPMs.push(metrics.wpm);
      this.typingIntervals.push(metrics.averageInterval);
      this.typingCorrections.push(metrics.correctionFrequency);
      this.sampleCount++;
    }
  }
  
  addMouseMetrics(metrics: MouseMetrics): void {
    if (!this.isCalibrating) return;
    if (metrics.velocity >= 0) {
      this.mouseVelocities.push(metrics.velocity);
      this.mouseClickDensities.push(metrics.clickDensity);
      this.mouseIdleTimes.push(metrics.idleTime);
      this.sampleCount++;
    }
  }
  
  addPostureData(posture: PostureData): void {
    if (!this.isCalibrating) return;
    this.neckAngles.push(posture.neckAngle);
    this.faceDistances.push(posture.faceDistance);
    this.sampleCount++;
  }
  
  addGazeData(gaze: GazeData): void {
    if (!this.isCalibrating) return;
    // Track gaze fixation duration (simplified)
    this.gazeFixations.push(100); // Placeholder
    this.sampleCount++;
  }
  
  // ==========================================================================
  // PROFILE GENERATION
  // ==========================================================================
  
  private generateProfile(): BaselineProfile {
    const now = Date.now();
    const actualDuration = now - this.calibrationStartTime;
    
    // Calculate blink baseline
    const blinkStats = this.calculateStatistics(this.blinkRates);
    const blinkNorm = {
      meanRate: blinkStats.mean,
      stdDev: blinkStats.stdDev,
      threshold: blinkStats.mean - blinkStats.stdDev, // Adaptive threshold
    };
    
    // Calculate typing baseline
    const typingWPMStats = this.calculateStatistics(this.typingWPMs);
    const typingIntervalStats = this.calculateStatistics(this.typingIntervals);
    const typingCorrectionStats = this.calculateStatistics(this.typingCorrections);
    const typingNorm = {
      meanWPM: typingWPMStats.mean,
      stdDev: typingWPMStats.stdDev,
      meanInterval: typingIntervalStats.mean,
      correctionRate: typingCorrectionStats.mean,
    };
    
    // Calculate mouse baseline
    const mouseVelocityStats = this.calculateStatistics(this.mouseVelocities);
    const mouseClickStats = this.calculateStatistics(this.mouseClickDensities);
    const mouseIdleStats = this.calculateStatistics(this.mouseIdleTimes);
    const mouseNorm = {
      meanVelocity: mouseVelocityStats.mean,
      stdDev: mouseVelocityStats.stdDev,
      meanClickDensity: mouseClickStats.mean,
      idleThreshold: mouseIdleStats.mean + mouseIdleStats.stdDev,
    };
    
    // Calculate posture baseline
    const neckAngleStats = this.calculateStatistics(this.neckAngles);
    const faceDistanceStats = this.calculateStatistics(this.faceDistances);
    const postureNorm = {
      meanNeckAngle: neckAngleStats.mean,
      stdDev: neckAngleStats.stdDev,
      meanDistance: faceDistanceStats.mean,
    };
    
    // Calculate gaze baseline
    const gazeFixationStats = this.calculateStatistics(this.gazeFixations);
    const gazeNorm = {
      meanFixationDuration: gazeFixationStats.mean,
      stdDev: gazeFixationStats.stdDev,
      saccadeFrequency: 3.0, // Placeholder
    };
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence();
    
    return {
      userId: this.userId,
      createdAt: now,
      calibrationDuration: actualDuration,
      sampleCount: this.sampleCount,
      blinkNorm,
      typingNorm,
      mouseNorm,
      postureNorm,
      gazeNorm,
      confidence,
    };
  }
  
  // ==========================================================================
  // STATISTICAL CALCULATIONS
  // ==========================================================================
  
  private calculateStatistics(data: number[]): {
    mean: number;
    stdDev: number;
    median: number;
    min: number;
    max: number;
  } {
    if (data.length === 0) {
      return { mean: 0, stdDev: 0, median: 0, min: 0, max: 0 };
    }
    
    // Mean
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    
    // Standard deviation
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    // Median
    const sorted = [...data].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Min/Max
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    return { mean, stdDev, median, min, max };
  }
  
  private calculateConfidence(): number {
    // Confidence based on sample count and data quality
    const sampleRatio = Math.min(this.sampleCount / this.targetSamples, 1.0);
    
    // Check data completeness
    const hasBlinkData = this.blinkRates.length > 10;
    const hasTypingData = this.typingWPMs.length > 10;
    const hasMouseData = this.mouseVelocities.length > 10;
    const hasPostureData = this.neckAngles.length > 10;
    
    const completeness = [hasBlinkData, hasTypingData, hasMouseData, hasPostureData]
      .filter(Boolean).length / 4;
    
    return (sampleRatio * 0.6 + completeness * 0.4);
  }
  
  // ==========================================================================
  // RESET
  // ==========================================================================
  
  private reset(): void {
    this.blinkRates = [];
    this.typingWPMs = [];
    this.typingIntervals = [];
    this.typingCorrections = [];
    this.mouseVelocities = [];
    this.mouseClickDensities = [];
    this.mouseIdleTimes = [];
    this.neckAngles = [];
    this.faceDistances = [];
    this.gazeFixations = [];
    this.sampleCount = 0;
  }
}

// ============================================================================
// BASELINE COMPARATOR
// ============================================================================

export class BaselineComparator {
  private baseline: BaselineProfile;
  
  constructor(baseline: BaselineProfile) {
    this.baseline = baseline;
  }
  
  /**
   * Compare current metrics against baseline
   * Returns deviation score (0 = at baseline, positive = above, negative = below)
   */
  compareBlinkRate(currentRate: number): {
    deviation: number;
    zScore: number;
    isAnomalous: boolean;
  } {
    const { meanRate, stdDev } = this.baseline.blinkNorm;
    const deviation = currentRate - meanRate;
    const zScore = stdDev > 0 ? deviation / stdDev : 0;
    const isAnomalous = Math.abs(zScore) > 2.0; // 2 standard deviations
    
    return { deviation, zScore, isAnomalous };
  }
  
  compareTypingSpeed(currentWPM: number): {
    deviation: number;
    zScore: number;
    isAnomalous: boolean;
  } {
    const { meanWPM, stdDev } = this.baseline.typingNorm;
    const deviation = currentWPM - meanWPM;
    const zScore = stdDev > 0 ? deviation / stdDev : 0;
    const isAnomalous = Math.abs(zScore) > 2.0;
    
    return { deviation, zScore, isAnomalous };
  }
  
  compareMouseVelocity(currentVelocity: number): {
    deviation: number;
    zScore: number;
    isAnomalous: boolean;
  } {
    const { meanVelocity, stdDev } = this.baseline.mouseNorm;
    const deviation = currentVelocity - meanVelocity;
    const zScore = stdDev > 0 ? deviation / stdDev : 0;
    const isAnomalous = Math.abs(zScore) > 2.0;
    
    return { deviation, zScore, isAnomalous };
  }
  
  updateBaseline(newBaseline: BaselineProfile): void {
    this.baseline = newBaseline;
  }
}
