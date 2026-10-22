/**
 * AURA AI - Typing Intelligence Engine
 * Enterprise-Grade Keystroke Dynamics Analysis
 */

import type { KeystrokeEvent, TypingMetrics, TelemetryBuffer } from '../types/telemetry';

// ============================================================================
// TYPING ENGINE
// ============================================================================

export class TypingEngine {
  private keystrokeBuffer: TelemetryBuffer<KeystrokeEvent>;
  private lastKeystrokeTime: number = 0;
  private totalKeystrokes: number = 0;
  private correctionCount: number = 0;
  private burstCount: number = 0;
  private hesitationCount: number = 0;
  
  private readonly windowMs: number;
  private readonly minSamplesForMetrics: number;
  private readonly burstThresholdMs: number;
  private readonly hesitationThresholdMs: number;
  
  private isListening: boolean = false;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  
  constructor(
    windowMs: number = 15000,
    minSamplesForMetrics: number = 10,
    burstThresholdMs: number = 200,
    hesitationThresholdMs: number = 1000
  ) {
    this.windowMs = windowMs;
    this.minSamplesForMetrics = minSamplesForMetrics;
    this.burstThresholdMs = burstThresholdMs;
    this.hesitationThresholdMs = hesitationThresholdMs;
    
    this.keystrokeBuffer = {
      data: [],
      maxSize: 1000,
      windowMs: this.windowMs,
      lastCleanup: Date.now(),
    };
  }
  
  // ==========================================================================
  // START/STOP
  // ==========================================================================
  
  start(): void {
    if (this.isListening) return;
    
    this.keydownHandler = (e: KeyboardEvent) => {
      this.handleKeystroke(e);
    };
    
    // Use capture phase for global tracking
    document.addEventListener('keydown', this.keydownHandler, true);
    this.isListening = true;
  }
  
  stop(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = null;
    }
    this.isListening = false;
  }
  
  // ==========================================================================
  // KEYSTROKE HANDLING
  // ==========================================================================
  
  private handleKeystroke(e: KeyboardEvent): void {
    const now = Date.now();
    const interval = this.lastKeystrokeTime > 0 ? now - this.lastKeystrokeTime : 0;
    
    // Filter: only count meaningful keys
    if (!this.isValidKey(e.key)) {
      return;
    }
    
    // Detect correction (backspace, delete)
    const isCorrection = e.key === 'Backspace' || e.key === 'Delete';
    if (isCorrection) {
      this.correctionCount++;
    }
    
    // Detect burst typing (rapid succession)
    if (interval > 0 && interval < this.burstThresholdMs) {
      this.burstCount++;
    }
    
    // Detect hesitation (long pause)
    if (interval > this.hesitationThresholdMs) {
      this.hesitationCount++;
    }
    
    // Create keystroke event
    const keystroke: KeystrokeEvent = {
      key: e.key,
      timestamp: now,
      interval,
      isCorrection,
    };
    
    // Add to buffer
    this.keystrokeBuffer.data.push(keystroke);
    this.totalKeystrokes++;
    this.lastKeystrokeTime = now;
    
    // Cleanup old data
    this.cleanupBuffer();
  }
  
  private isValidKey(key: string): boolean {
    // Count alphanumeric, space, enter, backspace, tab, punctuation
    if (key.length === 1) return true; // Single character
    if (key === ' ' || key === 'Space') return true;
    if (key === 'Enter') return true;
    if (key === 'Backspace' || key === 'Delete') return true;
    if (key === 'Tab') return true;
    return false;
  }
  
  // ==========================================================================
  // BUFFER MANAGEMENT
  // ==========================================================================
  
  private cleanupBuffer(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    this.keystrokeBuffer.data = this.keystrokeBuffer.data.filter(
      (event) => event.timestamp > cutoff
    );
    
    // Limit buffer size
    if (this.keystrokeBuffer.data.length > this.keystrokeBuffer.maxSize) {
      this.keystrokeBuffer.data = this.keystrokeBuffer.data.slice(-this.keystrokeBuffer.maxSize);
    }
    
    this.keystrokeBuffer.lastCleanup = now;
  }
  
  // ==========================================================================
  // METRICS CALCULATION
  // ==========================================================================
  
  getMetrics(): TypingMetrics {
    this.cleanupBuffer();
    
    const keystrokes = this.keystrokeBuffer.data;
    const keystrokeCount = keystrokes.length;
    
    // Insufficient data
    if (keystrokeCount < this.minSamplesForMetrics) {
      return {
        wpm: 0,
        averageInterval: 0,
        hesitationCount: 0,
        correctionFrequency: 0,
        burstCount: 0,
        timestamp: Date.now(),
        confidence: 0,
      };
    }
    
    // Calculate WPM (words per minute)
    // Average word = 5 characters
    // Scale from window to 60 seconds
    const scale = 60000 / this.windowMs;
    const wpm = Math.round((keystrokeCount / 5) * scale);
    
    // Calculate average interval
    const intervals = keystrokes
      .filter((k) => k.interval > 0)
      .map((k) => k.interval);
    
    const averageInterval = intervals.length > 0
      ? intervals.reduce((sum, val) => sum + val, 0) / intervals.length
      : 0;
    
    // Calculate correction frequency (corrections per minute)
    const corrections = keystrokes.filter((k) => k.isCorrection).length;
    const correctionFrequency = corrections * scale;
    
    // Calculate confidence based on sample size
    const confidence = Math.min(keystrokeCount / 50, 1.0);
    
    return {
      wpm,
      averageInterval: Math.round(averageInterval),
      hesitationCount: this.hesitationCount,
      correctionFrequency: Math.round(correctionFrequency * 10) / 10,
      burstCount: this.burstCount,
      timestamp: Date.now(),
      confidence,
    };
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  
  getTotalKeystrokes(): number {
    return this.totalKeystrokes;
  }
  
  getBufferSize(): number {
    return this.keystrokeBuffer.data.length;
  }
  
  getCorrectionCount(): number {
    return this.correctionCount;
  }
  
  getBurstCount(): number {
    return this.burstCount;
  }
  
  getHesitationCount(): number {
    return this.hesitationCount;
  }
  
  // ==========================================================================
  // RESET
  // ==========================================================================
  
  reset(): void {
    this.keystrokeBuffer.data = [];
    this.lastKeystrokeTime = 0;
    this.totalKeystrokes = 0;
    this.correctionCount = 0;
    this.burstCount = 0;
    this.hesitationCount = 0;
  }
}

// ============================================================================
// TYPING PATTERN ANALYZER
// ============================================================================

export class TypingPatternAnalyzer {
  private intervalHistory: number[] = [];
  private readonly maxHistorySize: number = 200;
  
  addInterval(interval: number): void {
    if (interval > 0 && interval < 5000) { // Filter outliers
      this.intervalHistory.push(interval);
      
      if (this.intervalHistory.length > this.maxHistorySize) {
        this.intervalHistory.shift();
      }
    }
  }
  
  getStatistics(): {
    mean: number;
    stdDev: number;
    median: number;
    p25: number;
    p75: number;
  } {
    if (this.intervalHistory.length === 0) {
      return { mean: 0, stdDev: 0, median: 0, p25: 0, p75: 0 };
    }
    
    // Mean
    const mean = this.intervalHistory.reduce((sum, val) => sum + val, 0) / this.intervalHistory.length;
    
    // Standard deviation
    const variance = this.intervalHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.intervalHistory.length;
    const stdDev = Math.sqrt(variance);
    
    // Percentiles
    const sorted = [...this.intervalHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    
    return { mean, stdDev, median, p25, p75 };
  }
  
  reset(): void {
    this.intervalHistory = [];
  }
}
