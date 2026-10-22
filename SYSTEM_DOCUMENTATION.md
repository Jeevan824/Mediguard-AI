# MindGuard.ai — Complete System Documentation

> **Version:** 2.0 (Power BI Dashboard + Enhanced Data Collection)  
> **Last Updated:** July 2026  
> **Authors:** Jeevan H D · Vishal S · Abhilash M  
> **Institution:** Nagarjuna College of Engineering and Technology, Bengaluru  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture & Pipeline](#2-architecture--pipeline)
3. [Data Collection — Sensors & Speed](#3-data-collection--sensors--speed)
4. [Signal Processing Algorithms](#4-signal-processing-algorithms)
5. [Cognitive Load Formula (CLI)](#5-cognitive-load-formula-cli)
6. [Wellness Scoring Engine](#6-wellness-scoring-engine)
7. [Power BI Analytics Dashboard](#7-power-bi-analytics-dashboard)
8. [Performance Specifications](#8-performance-specifications)
9. [Technology Stack](#9-technology-stack)
10. [File & Module Reference](#10-file--module-reference)
11. [Changelog v1 → v2](#11-changelog-v1--v2)

---

## 1. System Overview

**MindGuard.ai** is a real-time, browser-native cognitive load and stress monitoring system. It operates entirely client-side — no video or sensor data is ever transmitted to a server — using three passive sensing modalities:

| Modality | Sensor Source | Signals Captured |
|---|---|---|
| **Visual** | Webcam + MediaPipe FaceMesh | Eye Aspect Ratio (EAR), blink rate, head pose (yaw/pitch) |
| **Behavioral — Typing** | Browser keyboard events | WPM, inter-key interval (IKI) variance, error rate |
| **Behavioral — Mouse** | Browser pointer events | Speed, intensity, jerkiness, idle bursts, click count |

The system classifies cognitive load into three levels (**Low / Medium / High**) using a validated 5-signal weighted formula called the **Composite Load Index (CLI)** and computes 7 wellness dimensions in real time.

---

## 2. Architecture & Pipeline

### 6-Stage Intelligent Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│  Stage 1: USER INTERACTION                                          │
│  Webcam feed, keyboard input, mouse movement                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│  Stage 2: DATA COLLECTION                                           │
│  • MediaPipe FaceMesh @ 30+ FPS → 468 3D facial landmarks          │
│  • Keyboard events (8s rolling window)                              │
│  • Mouse pointer events (5s rolling window)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│  Stage 3: FEATURE EXTRACTION                                        │
│  • EAR from 4 landmark pairs (left + right eye)                     │
│  • Head pose from nose tip, chin, face edges (yaw/pitch)            │
│  • WPM from keystroke timestamps                                    │
│  • IKI variance from inter-key timing                               │
│  • Mouse speed, jerkiness (direction changes/sec)                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│  Stage 4: COGNITIVE LOAD COMPUTATION                                │
│  CLI = (Blink×0.25) + (Typing×0.20) + (EAR×0.20)                  │
│      + (Mouse×0.20) + (HeadPose×0.15)                               │
│  Stress = (Blink×0.35) + (EAR×0.30) + (Mouse×0.15)                 │
│         + (Typing×0.12) + (HeadPose×0.08)                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│  Stage 5: OVERLOAD DETECTION                                        │
│  CLI < 40 → Low | 40–69 → Medium | ≥ 70 → High                     │
│  7 Wellness Dimensions computed every 1 second                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│  Stage 6: SMART FEEDBACK + POWER BI DASHBOARD                       │
│  • Live KPI tiles, 6 chart panels, filter sidebar                   │
│  • Personalized alerts, break suggestions                           │
│  • Export: CSV / JSON / Print                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### React Component Hierarchy

```
App (Next.js App Router)
├── AuraProviders
│   ├── SensorProvider         ← telemetry bus (all sensor state)
│   ├── AuraProvider           ← wellness state + event log
│   ├── PersonalizationProvider← baseline + deviation detection
│   └── HealthProvider         ← sleep, hydration, movement breaks
│
├── /dashboard                 ← Live Dashboard (1s update)
│   ├── Camera + FaceMesh canvas
│   ├── Metric Rings × 6
│   ├── Stress Timeline chart
│   └── Live Signals panel
│
└── /powerbi                   ← Power BI Analytics Dashboard
    ├── Header (export buttons)
    ├── Sidebar (time range + signal filters)
    ├── KPI Tiles Row × 6
    ├── Multi-Signal Timeline chart
    ├── Wellness Radar chart
    ├── Keystroke Dynamics chart
    ├── Load Distribution Donut
    ├── Mouse Behavioral Bar chart
    ├── CLI Signal Breakdown panel
    └── Raw Signal Monitor (toggle)
```

---

## 3. Data Collection — Sensors & Speed

### 3.1 Eye / Face Sensor (MediaPipe FaceMesh)

| Parameter | v1 | v2 (Current) |
|---|---|---|
| Detection Confidence | 0.60 | **0.65** |
| Tracking Confidence | 0.60 | **0.65** |
| Landmarks | 468 (no iris) | **478** (with iris refinement) |
| Head Pose | ✗ | **✓ Yaw / Pitch / Distraction** |
| Blink Confidence | ✗ | **✓ Depth × Duration scoring** |
| EAR Smoothing | α = 0.3 EMA | α = 0.3 EMA (unchanged) |
| Adaptive Threshold | After 60 frames | After 60 frames (unchanged) |

**EAR Formula:**
```
EAR = (|p2 - p6| + |p3 - p5|) / (2 × |p1 - p4|)
    where p1-p6 are eye landmark coordinates
    Average of left eye EAR + right eye EAR
```

### 3.2 Typing Tracker

| Parameter | v1 | v2 (Current) |
|---|---|---|
| Rolling Window | 15 seconds | **8 seconds** |
| WPM Scale Factor | 60000/15000 = 4× | **60000/8000 = 7.5×** |
| IKI Variance | ✗ | **✓ Std-dev of inter-key intervals** |
| Error Rate | ✗ | **✓ Backspace / total keypresses** |
| Response Latency | ~15s lag | **~8s lag** |

**WPM Formula:**
```
WPM = (chars_in_window / 5) × (60000 / window_ms)
    where chars_in_window = non-backspace keypresses in last 8s
    Average word = 5 characters
```

**IKI Variance Formula:**
```
IKI_i = t_i - t_{i-1}   (ms between consecutive keypresses)
σ²    = Σ(IKI_i - μ)² / N
σ_norm = min(100, (σ / 500) × 100)   (normalized 0-100)
```
Higher σ_norm → more erratic typing → higher cognitive strain.

**Error Rate:**
```
error_rate = (backspace_count / total_keys) × 100
```

### 3.3 Mouse Tracker

| Parameter | v1 | v2 (Current) |
|---|---|---|
| Rolling Window | 10 seconds | **5 seconds** |
| Activity Threshold | 2s idle | 2s idle (unchanged) |
| Direction Changes | ✗ | **✓ Sign-flip detection (>3px moves)** |
| Jerkiness Score | ✗ | **✓ Dir changes per sec × 10** |
| Idle Bursts | ✗ | **✓ Count of returns after >3s idle** |
| Response Latency | ~10s lag | **~5s lag** |

**Jerkiness Formula:**
```
jerkiness = min(100, (direction_changes_in_last_10s / 10) × 100)
```

### 3.4 Head Pose Estimator (New in v2)

Uses MediaPipe landmarks: nose tip (1), chin (152), left face edge (234), right face edge (454), forehead (10).

```
face_center_x = (landmark[234].x + landmark[454].x) / 2
face_width    = |landmark[234] - landmark[454]|
yaw_offset    = (landmark[1].x - face_center_x) / (face_width / 2)  → [-1, +1]
yaw_degrees   = yaw_offset × 45

face_height   = |landmark[10] - landmark[152]|
mid_y         = (landmark[10].y + landmark[152].y) / 2
pitch_offset  = (landmark[1].y - mid_y) / (face_height / 2)
pitch_degrees = pitch_offset × 30

distraction   = min(100, |yaw| / 45 × 60 + |pitch| / 30 × 40)
```

---

## 4. Signal Processing Algorithms

### 4.1 Blink Detector (Adaptive)

The `BlinkDetector` class uses an adaptive threshold calibrated from the first 60 frames:

```
threshold_calibration:
  sorted = EAR_history.sort()
  median = sorted[n/2]
  threshold = clip(median × 0.75, 0.15, 0.25)
  [fires once after 60 EAR samples]

blink_detection:
  IF ear < threshold:
    below_count++
    track_min_ear_dip()
  ELSE:
    IF below_count in [minFrames=2, maxFrames=8]:
      register_blink()
      compute_confidence()
    reset below_count

blink_confidence:
  depth_ratio   = 1 - (min_ear_dip / threshold)
  duration_score = min(1, below_count / minFrames)
  confidence    = depth_ratio × 70 + duration_score × 30  → [0, 100]
```

### 4.2 EAR Smoother (Exponential Moving Average)

```
smoothed_EAR_t = α × raw_EAR_t + (1 - α) × smoothed_EAR_{t-1}
where α = 0.3 (lower = smoother, higher = more responsive)
```

---

## 5. Cognitive Load Formula (CLI)

### 5.1 Five-Signal Composite Load Index

```
CLI = S_Blink × 0.25
    + S_Typing × 0.20
    + S_EAR    × 0.20
    + S_Mouse  × 0.20
    + S_Head   × 0.15
```

### 5.2 Sub-score Mapping

**S_Blink (blink rate → cognitive load):**
| Blink Rate | Score |
|---|---|
| ≤ 8 blinks/min | 90 (staring, fatigued) |
| 9–12 | 60 |
| 13–18 | 15 (optimal) |
| 19–24 | 30 |
| 25–35 | 55 |
| > 35 | 80 (excessive) |

**S_Typing (WPM drop + IKI variance + error rate):**
```
ratio = typingWPM / baselineWPM
base  = {ratio≥0.9→10, ≥0.7→30, ≥0.5→55, ≥0.3→75, else→90}
S_Typing = min(100, base + ikiVariance×0.3 + errorRate×0.2)
```

**S_EAR (eye openness):**
| EAR | Score |
|---|---|
| ≥ 0.30 | 5 (alert) |
| 0.26–0.29 | 15 |
| 0.22–0.25 | 40 |
| 0.18–0.21 | 65 |
| < 0.18 | 90 (near-closed) |

**S_Mouse (inactivity + jerkiness):**
```
inactivity = max(0, 100 - mouseIntensity)
S_Mouse    = min(100, inactivity × 0.7 + jerkiness × 0.3)
```

**S_Head (pose distraction):**
```
S_Head = headDistraction  [0-100, computed from yaw/pitch]
```

### 5.3 Classification Thresholds
```
CLI < 40  → "Low"    (normal working state)
40–69     → "Medium" (elevated load, monitor)
≥ 70      → "High"   (overload, trigger alert)
```

### 5.4 Stress Score Formula
```
Stress = S_Blink × 0.35
       + S_EAR   × 0.30
       + S_Mouse × 0.15
       + S_Typing × 0.12
       + S_Head  × 0.08
```

---

## 6. Wellness Scoring Engine

Computed every **1 second** (upgraded from 3s in v1).

### 6.1 Seven Wellness Dimensions

| Dimension | Formula | Range |
|---|---|---|
| **Stress Score** | Direct from CLI stress formula | 0–100 (higher = worse) |
| **Fatigue Score** | EAR × 0.45 + BlinkFatigue × 0.30 + SessionFatigue × 0.25 | 0–100 (higher = worse) |
| **Focus Score** | Baseline 60 ± WPM/IKI/mouseActivity/cogLoad adjustments | 0–100 (higher = better) |
| **Energy Level** | 100 – stress×0.35 – fatigue×0.35 + sleepBoost – sessionDrain | 0–100 (higher = better) |
| **Burnout Risk** | burnoutRisk7d × 0.6 + stressLevel × 0.4 | 0–100 (higher = worse) |
| **Recovery Need** | (stress+fatigue+cogLoad pressure) × 0.75 + sessionPressure × 0.25 | 0–100 (higher = worse) |
| **Overall Wellness** | Aggregate of above (displayed as Aura score) | 0–100 |

### 6.2 Session Snapshot Schema (logged every 5 seconds)

Each snapshot is a JSON object with the following fields:

```json
{
  "timestamp":       1753200000000,
  "sessionMinutes":  12.5,
  "stressLevel":     35,
  "cognitiveLoad":   42,
  "cognitiveLabel":  "Medium",
  "blinkRate":       18,
  "eyeAspectRatio":  0.287,
  "typingWPM":       48,
  "ikiVariance":     22,
  "errorRate":       5,
  "mouseIntensity":  61,
  "mouseSpeed":      312,
  "jerkiness":       18,
  "idlePauses":      3,
  "headYaw":         -8,
  "headPitch":       4,
  "headDistraction": 11
}
```

Maximum 720 snapshots per session (1 hour at 5s intervals). Exportable as CSV or JSON.

---

## 7. Power BI Analytics Dashboard

**Route:** `/powerbi`  
**Layout:** Full-screen dark theme with sidebar + main chart grid

### 7.1 KPI Tiles Row (6 tiles)

| ID | Metric | Color Logic |
|---|---|---|
| `kpi-wellness` | Overall Wellness / 100 | Green ≥70, Amber 40-69, Red <40 |
| `kpi-stress` | Stress % | Inverted RAG |
| `kpi-load` | Cognitive Load % | Inverted RAG |
| `kpi-focus` | Focus % | Normal RAG |
| `kpi-duration` | Session Duration (min) | Static purple |
| `kpi-burnout` | Burnout Risk % | Inverted RAG |

### 7.2 Chart Panels (6 panels)

| Panel ID | Chart Type | Signals | Height |
|---|---|---|---|
| `panel-timeline` | Multi-line (Line) | Stress, Fatigue, Cognitive Load, Focus | 208px |
| `panel-radar` | Radar (hexagon) | 6 wellness dimensions | 208px |
| `panel-keystroke` | Dual-axis Line | WPM (left y) + Blink Rate (right y) | 176px |
| `panel-donut` | Doughnut | Low / Medium / High load time split | 176px |
| `panel-mouse` | Bar | Mouse speed per time point | 144px |
| `panel-cli` | Progress bars | 5-signal CLI breakdown + head pose | adaptive |

### 7.3 Filter Sidebar

- **Time Range:** Last 1 min (12 pts) / Last 5 min (60 pts) / Last 15 min (180 pts) / Full Session (720 pts)
- **Signal Toggles:** stress, fatigue, load, focus, blink, wpm (per-line visibility)
- **View Mode:** Computed metrics ↔ Raw Signals table toggle

### 7.4 Raw Signal Monitor

16 raw sensor values displayed in a grid when Raw Mode is active:

EAR · Blink/min · Blink Confidence · WPM · IKI Variance · Error Rate · Mouse Speed · Intensity · Jerkiness · Idle Bursts · Head Yaw · Head Pitch · Head Distraction · Cognitive Load · Stress · Fatigue

### 7.5 Export Capabilities

| Button ID | Action | Format |
|---|---|---|
| `btn-export-csv` | Download session log | `.csv` |
| `btn-export-json` | Download session log | `.json` |
| `btn-print` | Open print dialog | Browser PDF/Print |

---

## 8. Performance Specifications

| Metric | v1 | v2 (Current) |
|---|---|---|
| Wellness update rate | 3 seconds | **1 second** |
| WPM rolling window | 15 seconds | **8 seconds** |
| Mouse rolling window | 10 seconds | **5 seconds** |
| Session snapshot rate | — | **5 seconds** |
| Chart history depth | 20 points | **60 points** |
| MediaPipe detection conf. | 0.60 | **0.65** |
| MediaPipe tracking conf. | 0.60 | **0.65** |
| CLI signal count | 4 signals | **5 signals** |
| Head pose tracking | ✗ | **✓** |
| IKI variance tracking | ✗ | **✓** |
| Blink confidence scoring | ✗ | **✓** |
| Target FPS (camera) | 30 | 30 (MediaPipe Camera Utils) |
| Inference latency (EAR) | < 16ms | < 16ms |
| Session log capacity | — | **720 entries (1 hour)** |

---

## 9. Technology Stack

### Frontend Framework
- **Next.js 16.1.6** (React 19.2.3) — App Router with Turbopack
- **Tailwind CSS 4** — Utility-first styling
- **Framer Motion 12.35.1** — Animations and transitions

### AI & Computer Vision
- **MediaPipe Face Mesh 0.4** — 468 (+10 iris) 3D facial landmarks, client-side WebAssembly
- **MediaPipe Camera Utils** — Webcam integration and frame delivery

### Data Visualization
- **Chart.js 4.5.1** — Charting engine
- **React-ChartJS-2 5.3.1** — React wrapper
- **Chart types used:** Line, Radar, Bar, Doughnut

### Icons & UI
- **React Icons 5.6.0** — HeroIcons 2

### Browser APIs
- `document.addEventListener("keydown")` — keystroke tracking
- `window.addEventListener("mousemove")` — mouse tracking
- `URL.createObjectURL()` + `<a>.click()` — file export
- `localStorage` — sleep log persistence

---

## 10. File & Module Reference

```
majorpr-app/
├── src/
│   ├── app/
│   │   ├── dashboard/page.js      ← Live Dashboard (1s update, 5-signal CLI)
│   │   ├── powerbi/page.js        ← Power BI Analytics Dashboard [NEW v2]
│   │   ├── analytics/page.js      ← Cognitive Analytics (radar + bar charts)
│   │   ├── burnout/page.js        ← Burnout Risk module
│   │   ├── focus/page.js          ← Focus Session module
│   │   ├── recovery/page.js       ← Recovery module
│   │   ├── sleep/page.js          ← Sleep Intelligence
│   │   ├── assistant/page.js      ← AI Assistant
│   │   └── settings/page.js       ← Settings
│   │
│   ├── lib/
│   │   ├── faceDetection.js       ← MediaPipe init, EAR, BlinkDetector,
│   │   │                             EARSmoother, estimateHeadPose [ENHANCED v2]
│   │   ├── cognitiveLoad.js       ← 5-signal CLI formula, getCLIBreakdown()
│   │   │                             [ENHANCED v2]
│   │   ├── typingTracker.js       ← 8s WPM, IKI variance, error rate
│   │   │                             [ENHANCED v2]
│   │   ├── mouseTracker.js        ← 5s window, jerkiness, idle bursts
│   │   │                             [ENHANCED v2]
│   │   ├── wellnessScorer.js      ← 7 wellness dimensions, rawSignals export
│   │   │                             [ENHANCED v2]
│   │   ├── burnoutPredictor.js    ← 7-day burnout risk model
│   │   └── auraAssistant.js       ← AI recommendation engine
│   │
│   ├── context/
│   │   ├── SensorContext.js       ← Central telemetry bus, 60-pt history,
│   │   │                             sessionLog, exportCSV/JSON [ENHANCED v2]
│   │   ├── AuraContext.js         ← Wellness state + event log
│   │   ├── PersonalizationContext.js ← Baseline learning + deviation detection
│   │   └── HealthContext.js       ← Sleep, hydration, movement breaks
│   │
│   └── components/
│       ├── Navbar.js              ← Navigation (+ Power BI link) [ENHANCED v2]
│       ├── DashboardSection.js    ← Landing page dashboard section
│       ├── DetectionSection.js    ← Landing page detection section
│       └── aura/                  ← AuraOrb, MetricRing, AuraCard components
│
├── SYSTEM_DOCUMENTATION.md       ← THIS FILE [NEW v2]
└── PROJECT_DOCUMENTATION.md      ← Original feature manual
```

---

## 11. Changelog v1 → v2

### New Features

| Feature | File | Description |
|---|---|---|
| **Power BI Dashboard** | `src/app/powerbi/page.js` | Full analytics dashboard with 6 chart panels, KPI tiles, filters, export |
| **Head Pose Estimation** | `src/lib/faceDetection.js` | Yaw/pitch from face landmarks, 0-100 distraction score |
| **IKI Variance** | `src/lib/typingTracker.js` | Inter-key interval std-dev as cognitive strain signal |
| **Error Rate** | `src/lib/typingTracker.js` | Backspace/total keypresses ratio |
| **Mouse Jerkiness** | `src/lib/mouseTracker.js` | Direction changes per second, idle burst count |
| **Blink Confidence** | `src/lib/faceDetection.js` | Depth×duration confidence score per blink |
| **5-Signal CLI** | `src/lib/cognitiveLoad.js` | Added head pose as 5th signal (15% weight) |
| **getCLIBreakdown()** | `src/lib/cognitiveLoad.js` | Exportable per-signal breakdown for dashboard |
| **Session Log** | `src/context/SensorContext.js` | 720-entry timestamped snapshot log |
| **CSV/JSON Export** | `src/context/SensorContext.js` | Browser-native file download |
| **60-point chart history** | `src/context/SensorContext.js` | Increased from 20 to 60 rolling points |
| **rawSignals export** | `src/lib/wellnessScorer.js` | All 17 raw signals in one object for dashboard |

### Performance Upgrades

| Metric | Before | After |
|---|---|---|
| Wellness update rate | 3s | **1s** |
| WPM window | 15s | **8s** |
| Mouse window | 10s | **5s** |
| MediaPipe confidence | 0.60 | **0.65** |
| Chart history | 20 pts | **60 pts** |
| Session snapshots | none | **every 5s** |

---

*MindGuard.ai — Protecting mental wellness through intelligent real-time monitoring.*  
*© 2026 Jeevan H D, Vishal S, Abhilash M — NCET Bengaluru*
