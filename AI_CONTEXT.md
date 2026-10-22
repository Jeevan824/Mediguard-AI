# 🤖 AI_CONTEXT.md — Complete Project Intelligence File
> **Purpose:** This file is written FOR AI assistants. If you are an AI reading this codebase,
> start here. This single file gives you full project context so you can contribute immediately
> without reading every source file first.
>
> **Last Updated:** October 2026  
> **Maintained by:** Jeevan H D · Vishal S · Abhilash M  
> **Institution:** Nagarjuna College of Engineering and Technology, Bengaluru

---

## 1. 🎯 What Is This Project?

**MindGuard.ai** is a real-time, browser-native **cognitive load and stress monitoring** system.
It uses computer vision (webcam), keyboard tracking, and mouse tracking to detect mental fatigue
and burnout in real time — entirely **client-side, with zero data sent to a server**.

- **Package name in package.json:** `mediguard-ai` (legacy name, project is MindGuard.ai)
- **Dev server:** `npm run dev` → `http://localhost:3000`
- **Framework:** Next.js 16.1.6 (App Router, Turbopack), React 19.2.3
- **Styling:** Tailwind CSS 4 + custom glassmorphism design system
- **Backend/DB:** Supabase (PostgreSQL + Auth + RLS)

---

## 2. 📁 Project Structure

```
e:\MajorPr\majorpr-app\          ← Workspace root
├── src/
│   ├── app/                     ← Next.js App Router pages + API routes
│   │   ├── page.js              ← Landing page (/)
│   │   ├── layout.js            ← Root layout (wraps all pages with providers)
│   │   ├── globals.css          ← Global CSS (design tokens, animations)
│   │   ├── dashboard/page.js    ← Live monitoring dashboard (camera + real-time metrics)
│   │   ├── analytics/page.js    ← Cognitive analytics (radar + bar charts)
│   │   ├── assistant/page.js    ← AURA AI assistant (chat interface)
│   │   ├── burnout/page.js      ← 7-day burnout risk prediction gauge
│   │   ├── focus/page.js        ← Pomodoro timer + focus quality tracking
│   │   ├── sleep/page.js        ← Sleep intelligence & correlation charts
│   │   ├── powerbi/page.js      ← Power BI-style analytics dashboard (6 chart panels)
│   │   ├── research/page.js     ← Raw sensor data viewer + CSV export
│   │   ├── recovery/page.js     ← Recovery module
│   │   ├── settings/page.js     ← User settings
│   │   ├── login/page.js        ← Supabase email+password login
│   │   ├── register/page.js     ← Supabase email+password registration
│   │   ├── forgot-password/     ← Directory exists, NO page.js yet (404 — known issue)
│   │   └── api/
│   │       ├── sessions/        ← GET,POST monitoring sessions; [id] CRUD; [id]/snapshots
│   │       ├── sleep/           ← GET,POST sleep records; [id] CRUD
│   │       ├── analytics/       ← summary (GET), trends (GET)
│   │       ├── auth/            ← callback (GET), profile (GET)
│   │       ├── profile/         ← GET,POST,PATCH user profile
│   │       ├── aura/            ← messages (POST), history (GET) for AI assistant
│   │       ├── baseline/        ← GET,PATCH baseline profile
│   │       └── reports/         ← GET,POST wellness reports
│   │
│   ├── lib/                     ← Core computation engines (all client-side)
│   │   ├── faceDetection.js     ← MediaPipe FaceMesh, EAR calc, BlinkDetector,
│   │   │                           EARSmoother, estimateHeadPose
│   │   ├── cognitiveLoad.js     ← 5-signal CLI formula, getCLIBreakdown()
│   │   ├── typingTracker.js     ← WPM (8s window), IKI variance, error rate
│   │   ├── mouseTracker.js      ← Speed, intensity, jerkiness, idle bursts (5s window)
│   │   ├── wellnessScorer.js    ← 7 wellness dimensions + rawSignals export
│   │   ├── burnoutPredictor.js  ← 7-day rolling burnout risk model
│   │   ├── auraAssistant.js     ← AI recommendation engine
│   │   ├── apiResponse.js       ← Standardized API response helpers
│   │   └── supabase-browser.js  ← Browser-only Supabase client (no next/headers)
│   │
│   ├── context/                 ← Global React state (providers)
│   │   ├── SensorContext.js     ← Central telemetry bus — ALL sensor state lives here
│   │   │                           60-pt rolling history, sessionLog (720 snapshots),
│   │   │                           exportCSV/JSON, useSensor() hook
│   │   ├── AuraContext.js       ← Wellness state + event log
│   │   ├── PersonalizationContext.js ← Baseline learning + deviation detection
│   │   └── HealthContext.js     ← Sleep, hydration, movement breaks
│   │
│   ├── components/
│   │   ├── Navbar.js            ← Fixed nav, glassmorphism, scroll-aware
│   │   ├── DashboardSection.js  ← Landing page dashboard preview
│   │   ├── DetectionSection.js  ← Landing page camera/detection preview
│   │   ├── HeroSection.js       ← Landing page hero + neural network canvas bg
│   │   ├── AboutSection.js      ← Feature cards section
│   │   ├── ArchitectureSection.js ← 6-stage pipeline diagram
│   │   ├── TechStackSection.js  ← Tech badges
│   │   ├── ImpactSection.js     ← Benefits section
│   │   ├── FutureScopeSection.js ← Roadmap section
│   │   ├── Footer.js
│   │   ├── health/
│   │   │   ├── BreathingGuide.js     ← 4-7-8 breathing method, auto-trigger
│   │   │   ├── HydrationReminder.js  ← Adaptive hydration intervals + daily log
│   │   │   ├── MovementPrompt.js     ← Movement break reminders
│   │   │   └── ScreenDistanceAlert.js ← IPD-based calibration for screen distance
│   │   └── aura/
│   │       ├── AuraOrb.js       ← Animated wellness orb
│   │       ├── MetricRing.js    ← Radial metric display ring
│   │       └── AuraCard.js      ← Wellness card component
│   │
│   ├── config/                  ← App-wide configuration
│   └── middleware.js            ← Supabase session middleware (protects all routes)
│
├── public/                      ← Static assets
├── docs/                        ← Additional documentation
├── aura-ai/                     ← Aura AI sub-module/scripts
├── dataset.csv                  ← Training/test dataset
├── dataset_results.csv          ← Dataset results
├── evaluate_dataset.js          ← Dataset evaluation script
├── package.json
├── next.config.mjs
├── jsconfig.json
├── .env.local                   ← ACTUAL secrets (git-ignored)
├── .env.example                 ← Env template (safe to read)
├── PROJECT_DOCUMENTATION.md     ← Full feature manual (v1 docs)
├── SYSTEM_DOCUMENTATION.md      ← Technical system docs (v2)
├── PHASE_A_COMPLETION_REPORT.md ← Audit/fix completion report
└── AI_CONTEXT.md                ← THIS FILE
```

---

## 3. 🔑 Environment Variables

```env
# Required — get from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here  # server-side only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** Supabase CLI (`supabase start`) is NOT installed on this machine.
> The project uses a **remote Supabase cloud project** configured via `.env.local`.
> Do NOT try to run `supabase start` locally.

---

## 4. 📦 Dependencies

### Production
| Package | Version | Purpose |
|---|---|---|
| `next` | 16.1.6 | Framework (App Router + Turbopack) |
| `react` / `react-dom` | 19.2.3 | UI library |
| `@supabase/supabase-js` | ^2.117.2 | Database + Auth client |
| `@supabase/ssr` | ^0.12.7 | Server-side Supabase (middleware/API) |
| `@mediapipe/face_mesh` | ^0.4.1633559619 | 478-point facial landmark detection |
| `@mediapipe/camera_utils` | ^0.3.1675466862 | Webcam stream management |
| `@mediapipe/drawing_utils` | ^0.3.1675466124 | Landmark overlay rendering |
| `framer-motion` | ^12.35.1 | Animations and transitions |
| `chart.js` | ^4.5.1 | Chart rendering engine |
| `react-chartjs-2` | ^5.3.1 | React wrapper for Chart.js |
| `react-icons` | ^5.6.0 | Icon library (HeroIcons 2) |
| `three` | ^0.184.0 | 3D graphics (Three.js) |
| `zod` | ^4.6.5 | Schema validation |

### Dev
| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | ^4 | Utility CSS |
| `@tailwindcss/postcss` | ^4 | PostCSS integration |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.1.6 | Next.js ESLint rules |

---

## 5. 🧠 Core Algorithm — Composite Load Index (CLI)

The heart of the system. Combines 5 signals into a 0–100 cognitive load score.

### Signal Sub-scores (all 0–100)

**S_Blink** (blink rate):
| Blinks/min | Score |
|---|---|
| ≤8 | 90 (staring / fatigued) |
| 9–12 | 60 |
| 13–18 | 15 (optimal) |
| 19–24 | 30 |
| 25–35 | 55 |
| >35 | 80 (excessive) |

**S_Typing** (WPM drop + IKI variance + error rate):
```
ratio = currentWPM / baselineWPM (default baseline = 50 WPM)
base  = {ratio>=0.9 -> 10, >=0.7 -> 30, >=0.5 -> 55, >=0.3 -> 75, else -> 90}
S_Typing = min(100, base + ikiVariance*0.3 + errorRate*0.2)
```

**S_EAR** (eye openness via Eye Aspect Ratio):
| EAR | Score |
|---|---|
| ≥0.30 | 5 (alert) |
| 0.26–0.29 | 15 |
| 0.22–0.25 | 40 |
| 0.18–0.21 | 65 |
| <0.18 | 90 (near-closed) |

**S_Mouse** (inactivity + jerkiness):
```
inactivity = max(0, 100 - mouseIntensity)
S_Mouse    = min(100, inactivity*0.7 + jerkiness*0.3)
```

**S_Head** (head pose distraction from yaw/pitch):
```
S_Head = headDistraction  [0-100, computed in faceDetection.js]
```

### Final Formulas
```
CLI    = S_Blink*0.25 + S_Typing*0.20 + S_EAR*0.20 + S_Mouse*0.20 + S_Head*0.15
Stress = S_Blink*0.35 + S_EAR*0.30 + S_Mouse*0.15 + S_Typing*0.12 + S_Head*0.08
```

### Classifications
```
CLI < 40  -> "Low"    (green)
40-69     -> "Medium" (amber)
>=70      -> "High"   (red)
```

---

## 6. 🌐 Pages & Routes Reference

| URL | Type | Description |
|---|---|---|
| `/` | Static | Landing page — hero, about, architecture, tech stack |
| `/dashboard` | Static/Client | Live monitoring: camera, FaceMesh, metric rings, stress timeline |
| `/analytics` | Static/Client | Cognitive analytics: radar + bar charts, event log |
| `/assistant` | Static/Client | AURA AI chat interface |
| `/burnout` | Static/Client | 7-day burnout risk prediction gauge |
| `/focus` | Static/Client | Pomodoro timer + focus quality tracking |
| `/sleep` | Static/Client | Sleep log, correlation chart, wellness tips |
| `/powerbi` | Static/Client | Power BI-style analytics: 6 chart panels, KPI tiles, filters, export |
| `/research` | Static/Client | Raw sensor data monitor, CSV/JSON export |
| `/recovery` | Static/Client | Recovery module |
| `/settings` | Static/Client | User settings |
| `/login` | Static | Supabase auth — email + password sign in |
| `/register` | Static | Supabase auth — email + password sign up |
| `/forgot-password` | — | **MISSING page.js — currently 404** |

### API Routes (all dynamic, Supabase auth verified)

| Route | Methods | Description |
|---|---|---|
| `/api/sessions` | GET, POST | Monitoring sessions list / create |
| `/api/sessions/[id]` | GET, PATCH, DELETE | Single session CRUD |
| `/api/sessions/[id]/snapshots` | GET, POST | Sensor snapshots for a session |
| `/api/sleep` | GET, POST | Sleep records |
| `/api/sleep/[id]` | GET, PATCH, DELETE | Single sleep record CRUD |
| `/api/analytics/summary` | GET | Analytics summary |
| `/api/analytics/trends` | GET | Analytics trends |
| `/api/auth/callback` | GET | OAuth callback / code exchange |
| `/api/auth/profile` | GET | Auth profile |
| `/api/profile` | GET, POST, PATCH | User profile CRUD |
| `/api/aura/messages` | POST | Save AURA AI conversation exchange |
| `/api/aura/history` | GET | Retrieve AURA conversation history |
| `/api/reports` | GET, POST | Wellness reports CRUD |
| `/api/baseline` | GET, PATCH | Baseline profile CRUD |

---

## 7. 🗄️ Database Schema (Supabase PostgreSQL)

All tables use **Row-Level Security (RLS)** — `user_id = auth.uid()`.
All API routes use the **server Supabase client** with cookie-based sessions.

| Table | Used By | Purpose |
|---|---|---|
| `monitoring_sessions` | `/api/sessions` | Session metadata |
| `sensor_snapshots` | `/api/sessions/[id]/snapshots` | 5s sensor snapshot log |
| `sleep_records` | `/api/sleep` | Sleep duration + quality logs |
| `profiles` | `/api/profile` | User profile data |
| `user_settings` | `/api/profile` | Created on signup |
| `baseline_profiles` | `/api/baseline` | WPM baseline, typing style |
| `aura_conversations` | `/api/aura` | AURA AI chat history |
| `wellness_reports` | `/api/reports` | Generated wellness reports |

---

## 8. 🔗 Context Providers (React State)

All providers are wrapped in `AuraProviders` in `src/app/layout.js`.

### SensorContext (src/context/SensorContext.js)
**The primary telemetry bus.** Every sensor value flows through here.

Key state:
- `isCameraActive`, `faceLandmarks` (468+ points)
- `eyeAspectRatio`, `blinkRate` (BPM), `blinkCount`
- `typingWPM`, `totalKeystrokes`
- `mouseSpeed` (px/s), `mouseDistance`, `mouseClicks`, `mouseActive`, `mouseIntensity`
- `cognitiveLoad` (0-100), `cognitiveLabel` (Low/Medium/High), `stressLevel` (0-100)
- `blinkHistory`, `wpmHistory`, `mouseHistory`, `stressHistory` (60-point rolling arrays)
- `sessionLog` (up to 720 snapshots at 5s intervals)
- `exportSessionCSV()`, `exportSessionJSON()` — browser file download

Hook: `useSensor()` — throws if used outside `<SensorProvider>`

### AuraContext (src/context/AuraContext.js)
Wellness dimensions state + event log (overload alerts, break suggestions).

### PersonalizationContext (src/context/PersonalizationContext.js)
Baseline WPM learning + deviation detection from personal baseline.

### HealthContext (src/context/HealthContext.js)
Sleep data, hydration reminders, movement break tracking.

---

## 9. 🎨 Design System

**Dark glassmorphism aesthetic.**

### Colors
| Token | Value | Use |
|---|---|---|
| Background | `#050510` | Page background |
| Foreground | `#e8e8f0` | Body text |
| Primary | `#6366f1` | Indigo — primary accent |
| Accent | `#06b6d4` | Cyan — secondary accent |
| Surface | `rgba(15,15,35,0.8)` | Card backgrounds |
| Border | `rgba(99,102,241,0.2)` | Card/element borders |
| Success | Green | Low load / relaxed |
| Warning | Amber | Medium load / moderate |
| Danger | Red | High load / stressed |

### Typography
- **Body:** Inter (Google Fonts)
- **Display:** Outfit (Google Fonts)
- **Mono:** System monospace

### Key Effects
- **Glassmorphism:** `backdrop-filter: blur(20px)` on cards
- **Gradient text:** Animated 4-color gradient (4s infinite)
- **Glow:** `box-shadow` with color at low opacity
- **Hover:** `translateY(-2px)` + shadow lift
- **Animations:** Framer Motion for page/section entrance

---

## 10. 🔐 Authentication Flow

1. User visits any protected route → `src/middleware.js` intercepts
2. Middleware calls `supabase.auth.getUser()` with cookie session
3. If no session → redirect to `/login`
4. Login page: `supabase.auth.signInWithPassword()` → sets cookie → redirect to `/dashboard`
5. Register page: `supabase.auth.signUp()` → sends confirmation email

**Important:** Use `src/lib/supabase-browser.js` for client components (avoids importing
`next/headers` in browser bundle). Use `@supabase/ssr` `createServerClient` for API routes.

---

## 11. 🔬 Sensor Modules (src/lib/)

### faceDetection.js
- `initFaceDetection(videoEl, canvasEl, onResult)` — starts MediaPipe FaceMesh
- `calculateEAR(landmarks)` — Eye Aspect Ratio from landmark pairs
- `EARSmoother` class — exponential moving average (alpha=0.3)
- `BlinkDetector` class — adaptive threshold (calibrated from first 60 frames,
  threshold = 75% of median EAR, clamped 0.15–0.25)
- `estimateHeadPose(landmarks)` — returns `{yaw, pitch, distraction}` from nose/chin/face-edge landmarks
- `drawLandmarks(canvas, landmarks)` — renders face mesh overlay on canvas

**MediaPipe config:**
- `maxNumFaces: 1`, `refineLandmarks: true` (478 pts with iris)
- Detection confidence: 0.65, Tracking confidence: 0.65
- Camera: 640x480, 30 FPS

### typingTracker.js — TypingTracker class
- `start(onUpdate)` / `stop()` — global `keydown` listener (capture phase)
- Excludes modifier keys (Ctrl, Shift, Alt)
- `getWPM()` — 8-second rolling window, formula: `(chars/5) * (60000/8000)`
- `getIKIVariance()` — inter-key interval std-dev (normalized 0-100)
- `getErrorRate()` — backspace/total keypresses ratio

### mouseTracker.js — MouseTracker class
- `start(onUpdate)` / `stop()` — passive `mousemove` + `click` listeners
- 5-second rolling window
- `getMetrics()` returns: `{speed, totalDistance, clickCount, isActive, intensity, jerkiness, idleBursts}`
- Jerkiness: direction changes per second x10 (capped at 100)
- Idle burst: returns to active after >3s idle

### cognitiveLoad.js
- `calculateCognitiveLoad(blinkRate, typingWPM, ear, mouseIntensity, baselineWPM, ikiVariance, errorRate, jerkiness, headDistraction)`
- Returns: `{load, label, stress}`
- `getCLIBreakdown()` — returns per-signal breakdown for dashboard display

### wellnessScorer.js
- `computeWellness(sensorData)` — returns 7 wellness dimensions:
  `stressScore`, `fatigueScore`, `focusScore`, `energyLevel`, `burnoutRisk`, `recoveryNeed`, `overallWellness`
- `rawSignals` export — all 17 raw signals in one object

### burnoutPredictor.js
- 7-day rolling burnout risk model
- Returns 0-100 burnout risk percentage

---

## 12. 📊 Power BI Dashboard (/powerbi)

The most complex page. Renders entirely client-side using Chart.js.

### Layout
```
Header (title + export buttons: CSV, JSON, Print)
Sidebar (time range filter + signal toggles + raw mode toggle)
Main Grid:
  - KPI Tiles Row (6 tiles: Wellness, Stress, Load, Focus, Duration, Burnout)
  - Multi-Signal Timeline (Line: Stress, Fatigue, Load, Focus)
  - Wellness Radar (hexagonal radar: 6 wellness dimensions)
  - Keystroke Dynamics (dual-axis: WPM + Blink Rate)
  - Load Distribution Donut (Low/Medium/High time split)
  - Mouse Behavioral Bar (mouse speed per time point)
  - CLI Signal Breakdown (5 progress bars + head pose)
```

### Time Filters
- Last 1 min → 12 data points
- Last 5 min → 60 data points
- Last 15 min → 180 data points
- Full Session → up to 720 data points

### Export
- `btn-export-csv` → downloads `.csv`
- `btn-export-json` → downloads `.json`
- `btn-print` → browser print dialog

---

## 13. ⚠️ Known Issues & Limitations

| Issue | Severity | Notes |
|---|---|---|
| `/forgot-password` page missing | Low | Directory exists, no `page.js`, renders 404 |
| Session data not persisted to DB | Medium | SensorContext only stores in-memory + localStorage. `/api/sessions` snapshots NOT called during live monitoring. Out of scope for Phase A. |
| Middleware deprecation warning | Low | Next.js 16.1.6 warns `middleware` → use `proxy`. Doesn't break anything. |
| Supabase CLI not installed | Info | Project uses remote Supabase cloud. Do NOT run `supabase start`. |
| `package.json` name is `mediguard-ai` | Info | Legacy name, project is MindGuard.ai |

---

## 14. 🚀 How to Run

```bash
# Navigate to project
cd e:\MajorPr\majorpr-app

# Install dependencies (if needed)
npm install

# Start development server (Turbopack)
npm run dev
# → http://localhost:3000

# Lint
npm run lint

# Production build (only if needed)
npm run build
npm start
```

**Prerequisites:**
- Node.js 18+
- `.env.local` with valid Supabase credentials
- Modern browser with webcam (Chrome/Edge recommended)
- Webcam permissions granted in browser

---

## 15. 🧩 How the Live Dashboard Works (Step-by-Step)

1. User opens `/dashboard` → page mounts, providers initialize
2. User clicks "Start Camera" → `initFaceDetection()` called
3. MediaPipe FaceMesh loads from CDN → webcam stream at 640x480
4. Per frame (~30 FPS):
   - 478 landmarks detected, drawn on canvas overlay
   - `calculateEAR()` → smoothed with EMA (alpha=0.3)
   - `BlinkDetector.update(ear)` → adaptive threshold (75% of 60-frame median)
   - `estimateHeadPose()` → yaw, pitch, distraction
5. `TypingTracker` global keydown listener → WPM (8s window), IKI variance, error rate
6. `MouseTracker` global mousemove listener → speed, intensity, jerkiness (5s window)
7. Every **1 second**: `computeWellness()` → 7 wellness dimensions → AuraContext
8. Every **5 seconds**: snapshot logged to `SensorContext.sessionLog` (up to 720 entries)
9. `calculateCognitiveLoad()` → CLI (0-100) + label → displayed in metric rings
10. Charts update with rolling 60-point history

---

## 16. 🔄 Version History

| Version | Key Changes |
|---|---|
| v1 | 4-signal CLI (no head pose), 15s WPM window, 10s mouse window, 3s wellness update, 20-pt chart history |
| v2 (current) | +Head pose (5th signal), 8s WPM window, 5s mouse window, 1s wellness update, 60-pt chart history, Power BI dashboard, IKI variance, error rate, blink confidence, mouse jerkiness, session log (720 entries), CSV/JSON export |

---

## 17. 👥 Team & Credits

| Role | Name |
|---|---|
| Developer | Jeevan H D |
| Developer | Vishal S |
| Developer | Abhilash M |
| Institution | Nagarjuna College of Engineering and Technology, Bengaluru |

**Technologies used:**
Next.js (Vercel) · React (Meta) · MediaPipe (Google) · Chart.js · Tailwind CSS · Framer Motion · Supabase

---

*MindGuard.ai — Protecting mental wellness through intelligent real-time monitoring.*  
*© 2026 MindGuard AI. All rights reserved.*
