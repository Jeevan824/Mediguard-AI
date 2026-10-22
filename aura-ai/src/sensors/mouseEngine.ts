/**
 * AURA AI - Mouse Intelligence Engine
 * Enterprise-Grade Mouse Dynamics Analysis
 */

import type { MouseEvent as MouseTelemetryEvent, MouseMetrics, TelemetryBuffer } from '../types/telemetry';

// ============================================================================
// MOUSE ENGINE
// ============================================================================

export class MouseEngine {
  private eventBuffer: TelemetryBuffer<MouseTelemetryEvent>;
  private lastPosition: { x: number; y: number; timestamp: number } | null = null;
  private totalDistance: number = 0;
  private clickCount: number = 0;
  private lastClickTime: number = 0;
  private rageClickCount: number = 0;
  private idleStartTime: number = 0;
  private currentIdleTime: number = 0;
  
  private readonly windowMs: number;
  private readonly idleThresholdMs: number;
  private readonly rageClickThresholdMs: number;
  
  private isListening: boolean = false;
  private moveHandler: ((e: MouseEvent) => void) | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private scrollHandler: ((e: WheelEvent) => void) | null = null;
  
  constructor(
    windowMs: number = 10000,
    idleThresholdMs: number = 2000,
    rageClickThresholdMs: number = 300
  ) {
    this.windowMs = windowMs;
    this.idleThresholdMs = idleThresholdMs;
    this.rageClickThresholdMs = rageClickThresholdMs;
    
    this.eventBuffer = {
      data: [],
      maxSize: 2000,
      windowMs: this.windowMs,
      lastCleanup: Date.now(),
    };
  }
  
  // ==========================================================================
  // START/STOP
  // ==========================================================================
  
  start(): void {
    if (this.isListening) return;
    
    this.moveHandler = (e: MouseEvent) => {
      this.handleMouseMove(e);
    };
    
    this.clickHandler = (e: MouseEvent) => {
      this.handleMouseClick(e);
    };
    
    this.scrollHandler = (e: WheelEvent) => {
      this.handleMouseScroll(e);
    };
    
    // Passive listeners for performance
    window.addEventListener('mousemove', this.moveHandler, { passive: true });
    window.addEventListener('click', this.clickHandler);
    window.addEventListener('wheel', this.scrollHandler, { passive: true });
    
    this.isListening = true;
    this.idleStartTime = Date.now();
  }
  
  stop(): void {
    if (this.moveHandler) {
      window.removeEventListener('mousemove', this.moveHandler);
      this.moveHandler = null;
    }
    if (this.clickHandler) {
      window.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener('wheel', this.scrollHandler);
      this.scrollHandler = null;
    }
    this.isListening = false;
  }
  
  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================
  
  private handleMouseMove(e: MouseEvent): void {
    const now = Date.now();
    const currentPos = { x: e.clientX, y: e.clientY, timestamp: now };
    
    // Calculate distance from last position
    if (this.lastPosition) {
      const dx = currentPos.x - this.lastPosition.x;
      const dy = currentPos.y - this.lastPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.totalDistance += distance;
    }
    
    // Create event
    const event: MouseTelemetryEvent = {
      x: e.clientX,
      y: e.clientY,
      timestamp: now,
      eventType: 'move',
    };
    
    this.eventBuffer.data.push(event);
    this.lastPosition = currentPos;
    
    // Reset idle timer
    this.idleStartTime = now;
    this.currentIdleTime = 0;
    
    this.cleanupBuffer();
  }
  
  private handleMouseClick(e: MouseEvent): void {
    const now = Date.now();
    
    // Detect rage clicking (rapid successive clicks)
    if (this.lastClickTime > 0 && now - this.lastClickTime < this.rageClickThresholdMs) {
      this.rageClickCount++;
    }
    
    const event: MouseTelemetryEvent = {
      x: e.clientX,
      y: e.clientY,
      timestamp: now,
      eventType: 'click',
    };
    
    this.eventBuffer.data.push(event);
    this.clickCount++;
    this.lastClickTime = now;
    
    this.cleanupBuffer();
  }
  
  private handleMouseScroll(e: WheelEvent): void {
    const now = Date.now();
    
    const event: MouseTelemetryEvent = {
      x: e.clientX,
      y: e.clientY,
      timestamp: now,
      eventType: 'scroll',
    };
    
    this.eventBuffer.data.push(event);
    
    // Reset idle timer
    this.idleStartTime = now;
    this.currentIdleTime = 0;
    
    this.cleanupBuffer();
  }
  
  // ==========================================================================
  // BUFFER MANAGEMENT
  // ==========================================================================
  
  private cleanupBuffer(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    this.eventBuffer.data = this.eventBuffer.data.filter(
      (event) => event.timestamp > cutoff
    );
    
    // Limit buffer size
    if (this.eventBuffer.data.length > this.eventBuffer.maxSize) {
      this.eventBuffer.data = this.eventBuffer.data.slice(-this.eventBuffer.maxSize);
    }
    
    this.eventBuffer.lastCleanup = now;
  }
  
  // ==========================================================================
  // METRICS CALCULATION
  // ==========================================================================
  
  getMetrics(): MouseMetrics {
    this.cleanupBuffer();
    
    const now = Date.now();
    const events = this.eventBuffer.data;
    const moveEvents = events.filter((e) => e.eventType === 'move');
    
    // Update idle time
    if (moveEvents.length === 0 || now - this.idleStartTime > this.idleThresholdMs) {
      this.currentIdleTime = now - this.idleStartTime;
    } else {
      this.currentIdleTime = 0;
    }
    
    // Insufficient data
    if (moveEvents.length < 2) {
      return {
        velocity: 0,
        acceleration: 0,
        clickDensity: 0,
        movementEntropy: 0,
        idleTime: this.currentIdleTime,
        rageClickCount: this.rageClickCount,
        hoverInstability: 0,
        timestamp: now,
        confidence: 0,
      };
    }
    
    // Calculate velocity (px/s)
    const velocity = this.calculateVelocity(moveEvents);
    
    // Calculate acceleration (px/s²)
    const acceleration = this.calculateAcceleration(moveEvents);
    
    // Calculate click density (clicks per minute)
    const clickEvents = events.filter((e) => e.eventType === 'click');
    const clickDensity = (clickEvents.length / this.windowMs) * 60000;
    
    // Calculate movement entropy (0-1, higher = more chaotic)
    const movementEntropy = this.calculateMovementEntropy(moveEvents);
    
    // Calculate hover instability (0-1, higher = more jittery)
    const hoverInstability = this.calculateHoverInstability(moveEvents);
    
    // Calculate confidence based on sample size
    const confidence = Math.min(moveEvents.length / 100, 1.0);
    
    return {
      velocity: Math.round(velocity),
      acceleration: Math.round(acceleration),
      clickDensity: Math.round(clickDensity * 10) / 10,
      movementEntropy: Math.round(movementEntropy * 100) / 100,
      idleTime: this.currentIdleTime,
      rageClickCount: this.rageClickCount,
      hoverInstability: Math.round(hoverInstability * 100) / 100,
      timestamp: now,
      confidence,
    };
  }
  
  // ==========================================================================
  // ADVANCED CALCULATIONS
  // ==========================================================================
  
  private calculateVelocity(events: MouseTelemetryEvent[]): number {
    if (events.length < 2) return 0;
    
    let totalDistance = 0;
    
    for (let i = 1; i < events.length; i++) {
      const dx = events[i].x - events[i - 1].x;
      const dy = events[i].y - events[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    const timeSpan = (events[events.length - 1].timestamp - events[0].timestamp) / 1000;
    
    return timeSpan > 0 ? totalDistance / timeSpan : 0;
  }
  
  private calculateAcceleration(events: MouseTelemetryEvent[]): number {
    if (events.length < 3) return 0;
    
    const velocities: number[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const dx = events[i].x - events[i - 1].x;
      const dy = events[i].y - events[i - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const dt = (events[i].timestamp - events[i - 1].timestamp) / 1000;
      
      if (dt > 0) {
        velocities.push(distance / dt);
      }
    }
    
    if (velocities.length < 2) return 0;
    
    let totalAcceleration = 0;
    
    for (let i = 1; i < velocities.length; i++) {
      const dv = velocities[i] - velocities[i - 1];
      const dt = (events[i + 1].timestamp - events[i].timestamp) / 1000;
      
      if (dt > 0) {
        totalAcceleration += Math.abs(dv / dt);
      }
    }
    
    return totalAcceleration / (velocities.length - 1);
  }
  
  private calculateMovementEntropy(events: MouseTelemetryEvent[]): number {
    if (events.length < 10) return 0;
    
    // Divide screen into grid and calculate distribution
    const gridSize = 50; // 50x50 grid
    const grid: Set<string> = new Set();
    
    for (const event of events) {
      const gridX = Math.floor(event.x / gridSize);
      const gridY = Math.floor(event.y / gridSize);
      grid.add(`${gridX},${gridY}`);
    }
    
    // More unique cells = higher entropy
    const uniqueCells = grid.size;
    const maxExpectedCells = Math.min(events.length, 100);
    
    return Math.min(uniqueCells / maxExpectedCells, 1.0);
  }
  
  private calculateHoverInstability(events: MouseTelemetryEvent[]): number {
    if (events.length < 10) return 0;
    
    // Look for micro-movements (jitter) in recent events
    const recentEvents = events.slice(-20);
    let microMovements = 0;
    
    for (let i = 1; i < recentEvents.length; i++) {
      const dx = recentEvents[i].x - recentEvents[i - 1].x;
      const dy = recentEvents[i].y - recentEvents[i - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Count small movements (< 5px) as jitter
      if (distance > 0 && distance < 5) {
        microMovements++;
      }
    }
    
    return microMovements / recentEvents.length;
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  
  getTotalDistance(): number {
    return Math.round(this.totalDistance);
  }
  
  getTotalClicks(): number {
    return this.clickCount;
  }
  
  getRageClickCount(): number {
    return this.rageClickCount;
  }
  
  getBufferSize(): number {
    return this.eventBuffer.data.length;
  }
  
  isIdle(): boolean {
    return this.currentIdleTime > this.idleThresholdMs;
  }
  
  // ==========================================================================
  // RESET
  // ==========================================================================
  
  reset(): void {
    this.eventBuffer.data = [];
    this.lastPosition = null;
    this.totalDistance = 0;
    this.clickCount = 0;
    this.lastClickTime = 0;
    this.rageClickCount = 0;
    this.idleStartTime = Date.now();
    this.currentIdleTime = 0;
  }
}

// ============================================================================
// MOUSE PATTERN ANALYZER
// ============================================================================

export class MousePatternAnalyzer {
  private velocityHistory: number[] = [];
  private readonly maxHistorySize: number = 200;
  
  addVelocity(velocity: number): void {
    if (velocity >= 0 && velocity < 10000) { // Filter outliers
      this.velocityHistory.push(velocity);
      
      if (this.velocityHistory.length > this.maxHistorySize) {
        this.velocityHistory.shift();
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
    if (this.velocityHistory.length === 0) {
      return { mean: 0, stdDev: 0, median: 0, p25: 0, p75: 0 };
    }
    
    // Mean
    const mean = this.velocityHistory.reduce((sum, val) => sum + val, 0) / this.velocityHistory.length;
    
    // Standard deviation
    const variance = this.velocityHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.velocityHistory.length;
    const stdDev = Math.sqrt(variance);
    
    // Percentiles
    const sorted = [...this.velocityHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    
    return { mean, stdDev, median, p25, p75 };
  }
  
  reset(): void {
    this.velocityHistory = [];
  }
}
