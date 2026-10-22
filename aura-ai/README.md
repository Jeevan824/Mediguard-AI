# AURA AI - Phase 1: Human Telemetry & Behavioral Intelligence Foundation

## 🎯 Mission

Build enterprise-grade behavioral telemetry infrastructure capable of accurately collecting, calibrating, and streaming human biometric and interaction data in real-time.

**This is NOT a stress detection system. This is a telemetry foundation.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AURA AI PHASE 1                          │
│          Human Telemetry & Behavioral Intelligence          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Vision Engine   │  │  Typing Engine   │  │  Mouse Engine    │
│                  │  │                  │  │                  │
│ • Face Detection │  │ • Keystroke      │  │ • Velocity       │
│ • Eye Tracking   │  │   Dynamics       │  │ • Acceleration   │
│ • EAR Calculation│  │ • WPM Tracking   │  │ • Click Density  │
│ • Blink Detection│  │ • Hesitation     │  │ • Movement       │
│ • Head Pose      │  │ • Corrections    │  │   Entropy        │
│ • Gaze Tracking  │  │ • Burst Typing   │  │ • Rage Clicks    │
│ • Posture        │  │                  │  │ • Hover Jitter   │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Calibration Engine │
                    │                     │
                    │ • Adaptive Baseline │
                    │ • User Profiling    │
                    │ • No Hardcoded      │
                    │   Thresholds        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Telemetry Pipeline │
                    │                     │
                    │ • Streaming Buffers │
                    │ • Signal Smoothing  │
                    │ • Quality Scoring   │
                    │ • WebSocket Stream  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Real-Time UI      │
                    │                     │
                    │ • Live Detection    │
                    │ • Sensor Metrics    │
                    │ • Calibration View  │
                    │ • Telemetry Console │
                    └─────────────────────┘
```

---

## 📁 Project Structure

```
aura-ai/
├── src/
│   ├── sensors/              # Behavioral sensor engines
│   │   ├── typingEngine.ts   # Keystroke dynamics
│   │   └── mouseEngine.ts    # Mouse behavior analysis
│   │
│   ├── vision/               # Computer vision systems
│   │   └── faceDetection.ts  # MediaPipe integration
│   │
│   ├── calibration/          # Adaptive baseline system
│   │   └── baselineCalibrator.ts
│   │
│   ├── telemetry/            # Data streaming & buffering
│   │   ├── telemetryEngine.ts
│   │   └── sensorQuality.ts
│   │
│   ├── websocket/            # Real-time communication
│   │   └── telemetrySocket.ts
│   │
│   ├── context/              # React state management
│   │   └── TelemetryContext.tsx
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useTelemetry.ts
│   │   ├── useVisionSensor.ts
│   │   ├── useTypingSensor.ts
│   │   └── useMouseSensor.ts
│   │
│   ├── ui/                   # User interface components
│   │   ├── LiveDetection.tsx
│   │   ├── SensorMetrics.tsx
│   │   ├── CalibrationCenter.tsx
│   │   └── TelemetryConsole.tsx
│   │
│   ├── types/                # TypeScript definitions
│   │   └── telemetry.ts
│   │
│   └── utils/                # Utility functions
│       ├── smoothing.ts
│       └── statistics.ts
│
├── backend/                  # FastAPI Python server
│   ├── main.py
│   ├── websocket_handler.py
│   └── requirements.txt
│
└── README.md
```

---

## 🔧 Core Systems

### 1. Vision Engine (`src/vision/faceDetection.ts`)

**Capabilities:**
- 468-point facial landmark detection (MediaPipe FaceMesh)
- Eye Aspect Ratio (EAR) calculation with exponential smoothing
- Adaptive blink detection with auto-calibration
- Head pose estimation (pitch, yaw, roll)
- Posture analysis (shoulder alignment, neck angle, face distance)
- Gaze estimation using iris tracking
- Face quality scoring

**Key Classes:**
- `EARSmoother`: Exponential moving average filter (α=0.3)
- `AdaptiveBlinkDetector`: Self-calibrating blink detection (2-8 frame validation)

**Quality Metrics:**
- Landmark confidence (0-1)
- Face size appropriateness
- Face centering score
- Overall detection quality

---

### 2. Typing Intelligence Engine (`src/sensors/typingEngine.ts`)

**Capabilities:**
- Real-time keystroke capture (global event listener)
- Words Per Minute (WPM) calculation with rolling 15s window
- Average inter-keystroke interval tracking
- Hesitation detection (pauses > 1000ms)
- Correction frequency (backspace/delete tracking)
- Burst typing detection (rapid succession < 200ms)

**Key Classes:**
- `TypingEngine`: Main telemetry collector
- `TypingPatternAnalyzer`: Statistical pattern analysis (mean, stdDev, percentiles)

**Metrics:**
- WPM (scaled to 60s)
- Average interval (ms)
- Hesitation count
- Correction frequency (per minute)
- Burst count
- Confidence score (0-1)

---

### 3. Mouse Intelligence Engine (`src/sensors/mouseEngine.ts`)

**Capabilities:**
- High-resolution movement tracking
- Velocity calculation (px/s)
- Acceleration calculation (px/s²)
- Click density (clicks per minute)
- Movement entropy (spatial distribution 0-1)
- Idle detection (2s threshold)
- Rage click detection (< 300ms between clicks)
- Hover instability (micro-movement jitter 0-1)

**Key Classes:**
- `MouseEngine`: Main telemetry collector
- `MousePatternAnalyzer`: Statistical pattern analysis

**Metrics:**
- Velocity (px/s)
- Acceleration (px/s²)
- Click density (per minute)
- Movement entropy (0-1)
- Idle time (ms)
- Rage click count
- Hover instability (0-1)
- Confidence score (0-1)

---

### 4. Calibration Engine (`src/calibration/baselineCalibrator.ts`)

**Purpose:** Generate adaptive, user-specific baselines. NO HARDCODED THRESHOLDS.

**Calibration Process:**
1. Collect 300+ samples over 60 seconds
2. Calculate statistical baselines for all sensors
3. Generate user-specific thresholds (mean ± stdDev)
4. Produce confidence score based on data quality

**Baseline Profile Includes:**
- **Blink Norm**: Mean rate, stdDev, adaptive threshold
- **Typing Norm**: Mean WPM, stdDev, mean interval, correction rate
- **Mouse Norm**: Mean velocity, stdDev, mean click density, idle threshold
- **Posture Norm**: Mean neck angle, stdDev, mean distance
- **Gaze Norm**: Mean fixation duration, stdDev, saccade frequency

**Key Classes:**
- `BaselineCalibrator`: Collects data and generates profile
- `BaselineComparator`: Compares current metrics vs baseline (z-scores)

---

## 🎯 What Phase 1 DOES

✅ **Accurate Sensor Collection**
- Face detection with 468 landmarks
- Eye tracking and blink detection
- Typing dynamics (WPM, intervals, corrections)
- Mouse dynamics (velocity, acceleration, entropy)
- Posture estimation
- Gaze tracking

✅ **Adaptive Calibration**
- User-specific baseline generation
- No universal hardcoded thresholds
- Statistical profiling (mean, stdDev, percentiles)
- Confidence scoring

✅ **Real-Time Telemetry**
- Streaming data buffers
- Signal smoothing (exponential moving average)
- Quality scoring for each sensor
- WebSocket transmission

✅ **Enterprise Architecture**
- Modular, scalable structure
- TypeScript type safety
- Clean separation of concerns
- Production-ready cleanup logic

---

## 🚫 What Phase 1 DOES NOT DO

❌ Stress prediction
❌ Burnout detection
❌ Fake AI scores
❌ Wellness recommendations
❌ Intervention systems
❌ Analytics dashboards
❌ Historical trend analysis
❌ Predictive modeling

**Phase 1 is ONLY telemetry infrastructure.**

---

## 🔬 Technical Specifications

### Vision System
- **Target FPS**: 30
- **Min Confidence**: 0.6
- **Smoothing Factor**: 0.3 (EMA alpha)
- **Calibration Samples**: 300 (10s @ 30 FPS)
- **Blink Validation**: 2-8 frames

### Typing System
- **Window**: 15,000ms (15s rolling)
- **Min Samples**: 10 keystrokes
- **Burst Threshold**: 200ms
- **Hesitation Threshold**: 1000ms

### Mouse System
- **Window**: 10,000ms (10s rolling)
- **Idle Threshold**: 2000ms
- **Rage Click Threshold**: 300ms
- **Buffer Size**: 2000 events

### Telemetry
- **Buffer Size**: 1000 events per sensor
- **Transmission Interval**: 100ms
- **Quality Update**: Real-time

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+ (for backend)
- Modern browser with webcam
- TypeScript 5+

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt
```

### Running

```bash
# Start frontend (Next.js)
npm run dev

# Start backend (FastAPI)
cd backend
python main.py
```

---

## 📊 Data Flow

```
User Interaction
      ↓
┌─────────────────────────────────┐
│  Sensor Engines (Browser)      │
│  • Vision (MediaPipe)           │
│  • Typing (KeyboardEvent)       │
│  • Mouse (MouseEvent)           │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  Telemetry Buffers              │
│  • Rolling windows              │
│  • Signal smoothing             │
│  • Quality scoring              │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  Calibration Engine             │
│  • Baseline generation          │
│  • Adaptive thresholds          │
│  • User profiling               │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  WebSocket Stream               │
│  • Real-time transmission       │
│  • 100ms intervals              │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  Backend (FastAPI)              │
│  • Data validation              │
│  • Storage (future)             │
│  • Processing (future)          │
└─────────────────────────────────┘
```

---

## 🎨 UI Components

### 1. Live Detection Screen
- Real-time webcam feed
- Facial landmark overlay
- Eye tracking visualization
- FPS counter
- Detection quality indicator

### 2. Sensor Metrics Panel
- Blink rate (per minute)
- Eye Aspect Ratio (EAR)
- Typing WPM
- Mouse velocity
- All metrics with confidence scores

### 3. Calibration Center
- Calibration progress bar
- Sample count
- Baseline preview
- Confidence indicator
- Start/Stop controls

### 4. Telemetry Console
- Raw sensor data stream
- Buffer sizes
- Quality scores
- WebSocket status
- Diagnostic information

---

## 🔐 Privacy & Security

- ✅ All processing happens client-side
- ✅ No video recording
- ✅ No data sent to third parties
- ✅ Session-based only (no persistence in Phase 1)
- ✅ User controls all data collection

---

## 📈 Success Criteria

Phase 1 is complete when the system can:

1. ✅ Accurately collect facial biometrics (468 landmarks @ 30 FPS)
2. ✅ Track eye movement and blink behavior with <5% error
3. ✅ Measure typing dynamics with confidence > 0.8
4. ✅ Analyze mouse behavior with entropy calculation
5. ✅ Generate user-specific baselines (no hardcoded thresholds)
6. ✅ Maintain stable real-time tracking (30+ FPS)
7. ✅ Provide sensor quality scores (0-1 for each sensor)
8. ✅ Stream telemetry via WebSocket at 100ms intervals

---

## 🔮 Future Phases

**Phase 2**: Pattern Recognition & Anomaly Detection
**Phase 3**: Predictive Modeling & ML Integration
**Phase 4**: Intervention Systems & Recommendations
**Phase 5**: Enterprise Features & Team Analytics

---

## 📝 License

Proprietary - AURA AI Phase 1

---

**Built with enterprise-grade precision. No fake AI. Just accurate telemetry.**
