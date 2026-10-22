# AURA AI Phase 1 - Implementation Guide

## 🎯 Overview

This guide provides step-by-step instructions for implementing the complete AURA AI Phase 1 system in your existing MajorPR application.

---

## 📋 Prerequisites

- ✅ Node.js 18+ installed
- ✅ Python 3.9+ installed
- ✅ Webcam available
- ✅ Modern browser (Chrome/Edge recommended)
- ✅ TypeScript knowledge
- ✅ React/Next.js experience

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Navigate to AURA AI directory
cd e:\MajorPr\majorpr-app\aura-ai

# Install Node dependencies
npm install

# Install Python dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Start Backend Server

```bash
# Terminal 1: Start FastAPI backend
cd backend
python main.py

# Server will start on http://localhost:8000
# WebSocket endpoint: ws://localhost:8000/ws/telemetry/{session_id}
```

### 3. Start Frontend

```bash
# Terminal 2: Start Next.js frontend
npm run dev

# Frontend will start on http://localhost:3000
```

---

## 📁 File Structure Created

```
aura-ai/
├── src/
│   ├── types/
│   │   └── telemetry.ts              ✅ Created - Type definitions
│   │
│   ├── vision/
│   │   └── faceDetection.ts          ✅ Created - Computer vision engine
│   │
│   ├── sensors/
│   │   ├── typingEngine.ts           ✅ Created - Typing intelligence
│   │   └── mouseEngine.ts            ✅ Created - Mouse intelligence
│   │
│   ├── calibration/
│   │   └── baselineCalibrator.ts     ✅ Created - Adaptive calibration
│   │
│   ├── context/
│   │   └── TelemetryContext.tsx      ✅ Created - React state management
│   │
│   ├── telemetry/                    ⏳ To implement
│   │   ├── telemetryEngine.ts
│   │   └── sensorQuality.ts
│   │
│   ├── websocket/                    ⏳ To implement
│   │   └── telemetrySocket.ts
│   │
│   ├── hooks/                        ⏳ To implement
│   │   ├── useTelemetry.ts
│   │   ├── useVisionSensor.ts
│   │   ├── useTypingSensor.ts
│   │   └── useMouseSensor.ts
│   │
│   └── ui/                           ⏳ To implement
│       ├── LiveDetection.tsx
│       ├── SensorMetrics.tsx
│       ├── CalibrationCenter.tsx
│       └── TelemetryConsole.tsx
│
├── backend/
│   ├── main.py                       ✅ Created - FastAPI server
│   └── requirements.txt              ✅ Created - Python dependencies
│
├── package.json                      ✅ Created
├── README.md                         ✅ Created
└── IMPLEMENTATION_GUIDE.md           ✅ Created (this file)
```

---

## 🔧 Implementation Steps

### Step 1: Create Telemetry Engine

Create `src/telemetry/telemetryEngine.ts`:

```typescript
/**
 * Telemetry Engine - Coordinates all sensors and manages data flow
 */

import { TypingEngine } from '../sensors/typingEngine';
import { MouseEngine } from '../sensors/mouseEngine';
import { BaselineCalibrator } from '../calibration/baselineCalibrator';
import type { SensorQuality } from '../types/telemetry';

export class TelemetryEngine {
  private typingEngine: TypingEngine;
  private mouseEngine: MouseEngine;
  private calibrator: BaselineCalibrator | null = null;
  
  constructor() {
    this.typingEngine = new TypingEngine();
    this.mouseEngine = new MouseEngine();
  }
  
  start(): void {
    this.typingEngine.start();
    this.mouseEngine.start();
  }
  
  stop(): void {
    this.typingEngine.stop();
    this.mouseEngine.stop();
  }
  
  startCalibration(userId: string): void {
    this.calibrator = new BaselineCalibrator(userId);
    this.calibrator.startCalibration();
  }
  
  stopCalibration() {
    if (!this.calibrator) return null;
    return this.calibrator.stopCalibration();
  }
  
  getTypingMetrics() {
    return this.typingEngine.getMetrics();
  }
  
  getMouseMetrics() {
    return this.mouseEngine.getMetrics();
  }
  
  getSensorQuality(): SensorQuality {
    const typingMetrics = this.typingEngine.getMetrics();
    const mouseMetrics = this.mouseEngine.getMetrics();
    
    return {
      faceDetection: 0, // Set by vision system
      eyeTracking: 0,   // Set by vision system
      typingSignal: typingMetrics.confidence,
      mouseSignal: mouseMetrics.confidence,
      overallQuality: (typingMetrics.confidence + mouseMetrics.confidence) / 2,
      timestamp: Date.now(),
    };
  }
}
```

### Step 2: Create WebSocket Client

Create `src/websocket/telemetrySocket.ts`:

```typescript
/**
 * WebSocket Client for Real-Time Telemetry Streaming
 */

import type { TelemetryMessage } from '../types/telemetry';

export class TelemetrySocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:8000/ws/telemetry/${this.sessionId}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        this.attemptReconnect();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received:', message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
    });
  }
  
  send(message: TelemetryMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, 2000 * this.reconnectAttempts);
    }
  }
}
```

### Step 3: Create Custom Hooks

Create `src/hooks/useVisionSensor.ts`:

```typescript
/**
 * Custom Hook for Vision Sensor Integration
 */

import { useEffect, useRef, useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import {
  calculateEAR,
  estimateHeadPose,
  estimatePosture,
  estimateGaze,
  EARSmoother,
  AdaptiveBlinkDetector,
  calculateFaceQuality,
} from '../vision/faceDetection';

export function useVisionSensor() {
  const telemetry = useTelemetry();
  const [isActive, setIsActive] = useState(false);
  const [fps, setFps] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const earSmootherRef = useRef<EARSmoother>(new EARSmoother(0.3));
  const blinkDetectorRef = useRef<AdaptiveBlinkDetector>(new AdaptiveBlinkDetector());
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const startCamera = async () => {
    // Implementation: Initialize MediaPipe FaceMesh
    // See existing MindGuard implementation for reference
    setIsActive(true);
  };
  
  const stopCamera = () => {
    setIsActive(false);
  };
  
  return {
    isActive,
    fps,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
  };
}
```

### Step 4: Create UI Components

Create `src/ui/LiveDetection.tsx`:

```typescript
/**
 * Live Detection Screen - Real-Time Vision Telemetry
 */

'use client';

import { useVisionSensor } from '../hooks/useVisionSensor';
import { useTelemetry } from '../context/TelemetryContext';

export function LiveDetection() {
  const { isActive, fps, videoRef, canvasRef, startCamera, stopCamera } = useVisionSensor();
  const telemetry = useTelemetry();
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Live Detection</h2>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Camera Feed */}
        <div className="col-span-2 bg-black rounded-lg relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          
          <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded">
            <span className="text-white text-sm">{fps} FPS</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="space-y-4">
          <button
            onClick={isActive ? stopCamera : startCamera}
            className={`w-full px-4 py-2 rounded ${
              isActive ? 'bg-red-500' : 'bg-green-500'
            } text-white`}
          >
            {isActive ? '⏹ Stop' : '▶ Start Camera'}
          </button>
          
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="text-sm font-semibold mb-2">Status</h3>
            <div className="text-xs space-y-1">
              <div>Camera: {isActive ? '🟢 Active' : '🔴 Inactive'}</div>
              <div>Face: {telemetry.faceLandmarks ? '✅ Detected' : '❌ Not Detected'}</div>
              <div>EAR: {telemetry.eyeMetrics?.averageEAR.toFixed(3) || '---'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Create Main App Page

Create `src/app/page.tsx`:

```typescript
'use client';

import { TelemetryProvider } from '../context/TelemetryContext';
import { LiveDetection } from '../ui/LiveDetection';
import { SensorMetrics } from '../ui/SensorMetrics';
import { CalibrationCenter } from '../ui/CalibrationCenter';
import { TelemetryConsole } from '../ui/TelemetryConsole';

export default function AuraAIPage() {
  return (
    <TelemetryProvider>
      <main className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 p-4">
          <h1 className="text-3xl font-bold">AURA AI - Phase 1</h1>
          <p className="text-sm text-gray-400">Human Telemetry & Behavioral Intelligence Foundation</p>
        </header>
        
        <div className="container mx-auto p-6 space-y-6">
          <LiveDetection />
          <SensorMetrics />
          <CalibrationCenter />
          <TelemetryConsole />
        </div>
      </main>
    </TelemetryProvider>
  );
}
```

---

## 🧪 Testing

### 1. Test Backend

```bash
# Start backend
cd backend
python main.py

# In another terminal, test health endpoint
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","timestamp":"2026-05-22T...","active_sessions":0}
```

### 2. Test WebSocket

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8000/ws/telemetry/test-session');

ws.onopen = () => {
  console.log('Connected!');
  ws.send(JSON.stringify({
    type: 'TYPING_METRICS',
    payload: { wpm: 50, confidence: 0.8 }
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

### 3. Test Sensors

```typescript
// Test typing engine
import { TypingEngine } from './src/sensors/typingEngine';

const typing = new TypingEngine();
typing.start();

// Type something...
setTimeout(() => {
  const metrics = typing.getMetrics();
  console.log('Typing metrics:', metrics);
}, 5000);
```

---

## 📊 Monitoring

### Backend Logs

The FastAPI server logs all telemetry events:

```
📸 High-quality face detection: session_123 (confidence: 0.92)
👁️  Blink detected: session_123 (duration: 4 frames)
⌨️  Typing metrics: session_123 (WPM: 65, confidence: 0.85)
🖱️  Mouse metrics: session_123 (velocity: 450 px/s, entropy: 0.67)
```

### Frontend Console

Enable debug logging:

```typescript
// In TelemetryContext.tsx
console.log('📊 Telemetry Update:', {
  eyeMetrics,
  typingMetrics,
  mouseMetrics,
  sensorQuality,
});
```

---

## 🐛 Troubleshooting

### Camera Not Starting

1. Check browser permissions (Settings → Privacy → Camera)
2. Ensure no other app is using webcam
3. Try different browser (Chrome recommended)
4. Check console for MediaPipe errors

### WebSocket Connection Failed

1. Verify backend is running (`curl http://localhost:8000/health`)
2. Check firewall settings
3. Ensure correct port (8000)
4. Check browser console for CORS errors

### Low FPS

1. Close other resource-intensive applications
2. Reduce MediaPipe confidence thresholds
3. Increase smoothing factor
4. Check CPU usage

### Typing/Mouse Not Tracking

1. Verify engines are started (`engine.start()`)
2. Check event listeners are attached
3. Ensure sufficient samples collected
4. Check confidence scores

---

## 🚀 Next Steps

1. ✅ **Complete UI Components** - Implement all 4 UI screens
2. ✅ **Add Visualization** - Charts for real-time metrics
3. ✅ **Implement Calibration Flow** - User onboarding
4. ✅ **Add Data Persistence** - Store baselines (localStorage)
5. ✅ **Optimize Performance** - Reduce CPU usage
6. ✅ **Add Error Handling** - Graceful degradation
7. ✅ **Write Tests** - Unit and integration tests
8. ✅ **Documentation** - API docs and user guide

---

## 📝 Notes

- **Phase 1 Focus**: Accurate telemetry collection ONLY
- **No Predictions**: Do not implement stress/burnout detection yet
- **Calibration Required**: Every user must generate baseline
- **Quality First**: Prioritize accuracy over features
- **Enterprise Grade**: Production-ready code quality

---

## 🔗 Resources

- [MediaPipe FaceMesh](https://google.github.io/mediapipe/solutions/face_mesh.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Built with enterprise-grade precision. No fake AI. Just accurate telemetry.**
