/**
 * Driver Safety Monitor — LIVE Webcam Detection Page
 * Route: /driver-safety
 *
 * Redesigned: terminal/analytics aesthetic (amber + charcoal)
 * Added: Report tab, Print/Export, session-ended banner
 * Fixed: duration_seconds key, Chart.js borderDash
 */
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSensor } from "@/context/SensorContext";
import { useAura } from "@/context/AuraContext";
import {
    FaceMonitor,
    AlertManager,
    AnalyticsEngine,
    fatigueScoreToColor,
    fatigueScoreToLabel,
    DEFAULT_THRESHOLDS,
} from "@/lib/driverSafetyEngine";
import { drawLandmarks } from "@/lib/faceDetection";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS, CategoryScale, LinearScale,
    PointElement, LineElement, Filler, Tooltip,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
    bg:       "#0d1117",
    surface:  "#161b22",
    surface2: "#1c2128",
    border:   "#21262d",
    border2:  "#30363d",
    text:     "#e6edf3",
    textMid:  "#8b949e",
    textDim:  "#484f58",
    amber:    "#e6a817",
    amberDim: "rgba(230,168,23,0.12)",
    amberBdr: "rgba(230,168,23,0.28)",
    ok:       "#3fb950",
    okDim:    "rgba(63,185,80,0.10)",
    warn:     "#d29922",
    warnDim:  "rgba(210,153,34,0.10)",
    crit:     "#da3633",
    critDim:  "rgba(218,54,51,0.10)",
    blue:     "#388bfd",
    purple:   "#bc8cff",
    mono:     "'JetBrains Mono','Courier New',monospace",
    sans:     "'Inter',system-ui,sans-serif",
};

// ── Shared primitives ──────────────────────────────────────────────────────────

function Panel({ children, style = {}, glow }) {
    return (
        <div style={{
            background:  T.surface,
            border:      `1px solid ${glow ? glow + "40" : T.border}`,
            borderRadius: 6,
            boxShadow:   glow ? `0 0 24px ${glow}18` : "none",
            ...style,
        }}>
            {children}
        </div>
    );
}

function PanelHeader({ label, color = T.amber, right }) {
    return (
        <div style={{
            display:     "flex",
            alignItems:  "center",
            justifyContent: "space-between",
            padding:     "10px 14px",
            borderBottom: `1px solid ${T.border}`,
        }}>
            <span style={{
                fontFamily:    T.mono,
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color,
            }}>{label}</span>
            {right}
        </div>
    );
}

function Tag({ children, color = T.amber }) {
    return (
        <span style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          4,
            padding:      "2px 8px",
            borderRadius: 3,
            fontSize:     10,
            fontWeight:   700,
            fontFamily:   T.mono,
            letterSpacing:"0.06em",
            background:   color + "18",
            color,
            border:       `1px solid ${color}35`,
        }}>{children}</span>
    );
}

function MetricRow({ label, value, color = T.text, mono = true }) {
    return (
        <div style={{
            display:     "flex",
            alignItems:  "center",
            justifyContent: "space-between",
            padding:     "7px 14px",
            borderBottom: `1px solid ${T.border}`,
        }}>
            <span style={{ fontSize: 11, color: T.textMid, fontFamily: T.sans }}>{label}</span>
            <span style={{
                fontSize:   12,
                fontWeight: 700,
                color,
                fontFamily: mono ? T.mono : T.sans,
            }}>{value}</span>
        </div>
    );
}

function StateRow({ label, active, color }) {
    return (
        <div style={{
            display:     "flex",
            alignItems:  "center",
            justifyContent: "space-between",
            padding:     "6px 14px",
            background:  active ? color + "0c" : "transparent",
            borderBottom: `1px solid ${T.border}`,
            transition:  "background 0.3s",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: active ? color : T.border2,
                    boxShadow:  active ? `0 0 8px ${color}` : "none",
                    transition: "all 0.3s",
                }} />
                <span style={{ fontSize: 11, color: active ? T.text : T.textDim, fontFamily: T.sans }}>
                    {label}
                </span>
            </div>
            <span style={{
                fontSize:   10,
                fontWeight: 700,
                fontFamily: T.mono,
                color:      active ? color : T.textDim,
            }}>{active ? "ACTIVE" : "—"}</span>
        </div>
    );
}

function FatigueBar({ score, color }) {
    return (
        <div style={{ padding: "0 14px 12px" }}>
            <div style={{
                display:     "flex",
                alignItems:  "baseline",
                gap:         6,
                marginBottom: 8,
            }}>
                <span style={{
                    fontSize:   32,
                    fontWeight: 900,
                    fontFamily: T.mono,
                    color,
                    lineHeight: 1,
                }}>{score}</span>
                <span style={{ fontSize: 14, color: T.textMid, fontFamily: T.mono }}>/100</span>
                <Tag color={color}>{fatigueScoreToLabel(score)}</Tag>
            </div>
            <div style={{
                height:       5,
                borderRadius: 3,
                background:   T.border,
                overflow:     "hidden",
            }}>
                <div style={{
                    height:     "100%",
                    width:      `${score}%`,
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                    borderRadius: 3,
                    transition: "width 0.5s ease",
                }} />
            </div>
        </div>
    );
}

// ── EAR Chart ──────────────────────────────────────────────────────────────────
function EARChart({ earHistory }) {
    const labels = earHistory.map((_, i) => i % 10 === 0 ? `${i}` : "");
    const data = {
        labels,
        datasets: [
            {
                label:           "EAR",
                data:            earHistory.map(h => h.ear != null ? h.ear : h),
                borderColor:     T.amber,
                backgroundColor: "rgba(230,168,23,0.07)",
                borderWidth:     1.5,
                fill:            true,
                tension:         0.35,
                pointRadius:     0,
            },
            {
                label:           "Threshold",
                data:            earHistory.map(() => DEFAULT_THRESHOLDS.ear_threshold),
                borderColor:     T.crit + "88",
                borderWidth:     1,
                borderDash:      [4, 4],
                fill:            false,
                pointRadius:     0,
                tension:         0,
            },
        ],
    };
    const opts = {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           { duration: 0 },
        plugins:             { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            x: { display: false },
            y: {
                min: 0, max: 0.5,
                grid:  { color: T.border + "88" },
                ticks: { color: T.textDim, font: { size: 8, family: T.mono }, maxTicksLimit: 4 },
            },
        },
    };
    return <Line data={data} options={opts} />;
}

// ── Alert badge ────────────────────────────────────────────────────────────────
function AlertBanner({ alert }) {
    if (!alert) return (
        <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            padding:      "10px 14px",
            background:   T.okDim,
            borderRadius: 4,
            border:       `1px solid ${T.ok}28`,
        }}>
            <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: T.ok,
                boxShadow:  `0 0 8px ${T.ok}`,
                animation:  "pulse 2s infinite",
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: T.mono, color: T.ok, letterSpacing: "0.06em" }}>
                NORMAL — DRIVER ALERT
            </span>
        </div>
    );
    return (
        <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            padding:      "10px 14px",
            background:   alert.color + "14",
            borderRadius: 4,
            border:       `1px solid ${alert.color}40`,
            animation:    "alertPulse 1.5s ease-in-out infinite",
        }}>
            <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: alert.color,
                boxShadow:  `0 0 10px ${alert.color}`,
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: T.mono, color: alert.color, letterSpacing: "0.05em" }}>
                {alert.message}
            </span>
        </div>
    );
}

// ── Utility: format seconds ────────────────────────────────────────────────────
function fmtDuration(secs) {
    const s = Math.round(secs || 0);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

// ── Export helpers ─────────────────────────────────────────────────────────────
function exportJSON(sessionStats, alertHistory) {
    const payload = {
        exported_at:  new Date().toISOString(),
        session:      sessionStats,
        alert_history: alertHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `driver_safety_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DriverSafetyPage() {
    const sensor = useSensor();
    const { updateWellness, logEvent, addIntervention } = useAura();

    const videoRef  = useRef(null);
    const canvasRef = useRef(null);
    const stopRef   = useRef(null);

    const faceMonitorRef  = useRef(null);
    const alertManagerRef = useRef(null);
    const analyticsRef    = useRef(null);

    const [isRunning,    setIsRunning]    = useState(false);
    const [isLoading,    setIsLoading]    = useState(false);
    const [cameraError,  setCameraError]  = useState(null);
    const [activeTab,    setActiveTab]    = useState("monitor");

    const [faceData,     setFaceData]     = useState(null);
    const [currentAlert, setCurrentAlert] = useState(null);
    const [alertHistory, setAlertHistory] = useState([]);
    const [sessionStats, setSessionStats] = useState(null);
    const [earChartData, setEarChartData] = useState([]);
    const [fps,          setFps]          = useState(0);
    const [sessionEnded, setSessionEnded] = useState(false);

    const fpsCounterRef = useRef({ count: 0, last: Date.now() });

    const initEngines = useCallback(() => {
        faceMonitorRef.current  = new FaceMonitor();
        alertManagerRef.current = new AlertManager();
        analyticsRef.current    = new AnalyticsEngine();
        setSessionEnded(false);
    }, []);

    const processFrame = useCallback((results) => {
        if (!faceMonitorRef.current || !analyticsRef.current || !alertManagerRef.current) return;

        const now       = performance.now() / 1000;
        const landmarks = results.multiFaceLandmarks?.[0] ?? null;

        const fd        = faceMonitorRef.current.detect(landmarks, now);
        const alertData = alertManagerRef.current.processAlerts(fd, {});
        analyticsRef.current.update(fd, alertData);
        const summary   = analyticsRef.current.getSessionSummary();

        if (canvasRef.current && videoRef.current) {
            const { videoWidth: w, videoHeight: h } = videoRef.current;
            canvasRef.current.width  = w;
            canvasRef.current.height = h;
            const ctx = canvasRef.current.getContext("2d");
            if (landmarks) drawLandmarks(ctx, landmarks, w, h);
            else ctx.clearRect(0, 0, w, h);
        }

        setFaceData(fd);
        setCurrentAlert(alertData);
        setAlertHistory(alertManagerRef.current.getAlertHistory().slice().reverse());
        setSessionStats(summary);
        setEarChartData(fd.ear_history.slice(-90));

        // FPS
        const fpsC = fpsCounterRef.current;
        fpsC.count++;
        const el = Date.now() - fpsC.last;
        if (el >= 1000) {
            setFps(Math.round(fpsC.count / (el / 1000)));
            fpsC.count = 0;
            fpsC.last  = Date.now();
        }

        // Bridge to context
        sensor.setEyeAspectRatio(fd.avg_ear);
        sensor.setBlinkRate(summary.blink_rate);
        sensor.setBlinkCount(fd.blink_count);
        sensor.setHeadYaw(fd.yaw);
        sensor.setHeadPitch(0);
        sensor.setHeadDistraction(Math.min(100, Math.round(Math.abs(fd.yaw) / 45 * 100)));
        sensor.setIsCameraActive(true);

        updateWellness({
            fatigueScore: summary.fatigue_score,
            focusScore:   fd.focus_alert ? Math.max(0, 70 - summary.attention_lapses * 10) : 80,
        });

        if (fd.blink_detected) logEvent("BLINK", `Blink ${fd.blink_duration.toFixed(2)}s | EAR ${fd.avg_ear.toFixed(3)}`);
        if (alertData) {
            logEvent(alertData.type, alertData.message, { summary });
            if (alertData.type === "SLEEP_DETECTED" || alertData.type === "SLEEPY_DETECTED") {
                addIntervention({
                    id:       "driver_drowsy",
                    type:     "DROWSINESS",
                    title:    "Drowsiness Detected",
                    message:  "Your driver safety monitor detected drowsiness. Take a break.",
                    priority: 10,
                });
            }
        }
    }, [sensor, updateWellness, logEvent, addIntervention]);

    const startCamera = useCallback(async () => {
        setIsLoading(true);
        setCameraError(null);
        initEngines();
        try {
            const { initFaceDetection } = await import("@/lib/faceDetection");
            if (!videoRef.current) throw new Error("Video element not ready");
            const cleanup = await initFaceDetection(videoRef.current, processFrame);
            stopRef.current = cleanup;
            setIsRunning(true);
        } catch (err) {
            console.error("Camera start error:", err);
            setCameraError(err.message || "Failed to start camera");
            sensor.setIsCameraActive(false);
        } finally {
            setIsLoading(false);
        }
    }, [initEngines, processFrame, sensor]);

    const stopCamera = useCallback(() => {
        if (stopRef.current) {
            try { stopRef.current(); } catch (_) {}
            stopRef.current = null;
        }
        if (videoRef.current) {
            const stream = videoRef.current.srcObject;
            if (stream) stream.getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setIsRunning(false);
        setFaceData(null);
        setCurrentAlert(null);
        sensor.setIsCameraActive(false);
        // Show session-ended banner if we have data
        if (analyticsRef.current) {
            setSessionEnded(true);
        }
    }, [sensor]);

    useEffect(() => {
        return () => { if (stopRef.current) { try { stopRef.current(); } catch (_) {} } };
    }, []);

    // ── Derived values ────────────────────────────────────────────────────────
    const ear          = faceData?.avg_ear      ?? 0;
    const mar          = faceData?.mar          ?? 0;
    const yaw          = faceData?.yaw          ?? 0;
    const isClosed     = faceData?.is_closed    ?? false;
    const faceFound    = faceData?.face_detected ?? false;
    const fatigue      = sessionStats?.fatigue_score ?? 0;
    const fatigueColor = fatigueScoreToColor(fatigue);

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const TABS = [
        { id: "monitor",   label: "◎  Live Monitor"  },
        { id: "analytics", label: "∿  Analytics"     },
        { id: "setup",     label: "⚙  Config"        },
        { id: "report",    label: "📋  Report"        },
    ];

    // ── Inline style helpers ──────────────────────────────────────────────────
    const tabStyle = (id) => ({
        padding:      "6px 14px",
        borderRadius: 4,
        fontSize:     12,
        fontWeight:   activeTab === id ? 600 : 400,
        fontFamily:   T.sans,
        color:        activeTab === id ? T.amber : T.textMid,
        background:   activeTab === id ? T.amberDim : "transparent",
        border:       `1px solid ${activeTab === id ? T.amberBdr : "transparent"}`,
        cursor:       "pointer",
        whiteSpace:   "nowrap",
        transition:   "all 0.15s",
    });

    const btnStyle = (variant = "primary") => ({
        padding:      "7px 16px",
        borderRadius: 4,
        fontSize:     12,
        fontWeight:   700,
        fontFamily:   T.mono,
        cursor:       "pointer",
        letterSpacing:"0.04em",
        border:       variant === "primary"
            ? `1px solid ${T.amberBdr}`
            : `1px solid ${T.border2}`,
        background:   variant === "primary" ? T.amberDim : T.surface2,
        color:        variant === "primary" ? T.amber    : T.textMid,
        transition:   "all 0.15s",
    });

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans, color: T.text }}>

            <style>{`
                @keyframes alertPulse {
                    0%,100% { opacity: 1; }
                    50%     { opacity: 0.75; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff !important; color: #000 !important; }
                    .print-only { display: block !important; }
                }
                .print-only { display: none; }
                ::-webkit-scrollbar { width: 4px; height: 4px; }
                ::-webkit-scrollbar-track { background: ${T.surface}; }
                ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 2px; }
            `}</style>

            {/* ── Page header ───────────────────────────────────────────────── */}
            <div style={{
                background:   T.surface,
                borderBottom: `1px solid ${T.border}`,
                padding:      "18px 24px 14px",
            }} className="no-print">
                <div style={{ maxWidth: 1280, margin: "0 auto" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <Tag color={isRunning ? T.ok : T.textDim}>
                                    {isRunning ? "● LIVE" : "○ OFFLINE"}
                                </Tag>
                                <Tag color={T.amber}>DRIVER SAFETY MONITOR</Tag>
                            </div>
                            <h1 style={{
                                fontSize:   22,
                                fontWeight: 800,
                                fontFamily: T.mono,
                                color:      T.text,
                                margin:     "6px 0 4px",
                                letterSpacing: "-0.03em",
                            }}>
                                Drowsiness &amp; Attention Detection
                            </h1>
                            <p style={{ fontSize: 12, color: T.textMid, maxWidth: 520, lineHeight: 1.5, margin: 0 }}>
                                Real-time face analysis via webcam — EAR · MAR · Head Pose · Fatigue Score.
                                Same models as the Python project, running live in your browser.
                            </p>
                        </div>

                        {/* Live stat strip */}
                        <div style={{ display: "flex", gap: 1 }}>
                            {[
                                { label: "FACE",    value: faceFound ? "OK" : "—",       color: faceFound ? T.ok : T.textDim   },
                                { label: "EAR",     value: ear.toFixed(3),                color: ear < 0.25 ? T.crit : T.amber  },
                                { label: "FATIGUE", value: `${fatigue}%`,                 color: fatigueColor                   },
                                { label: "FPS",     value: `${fps}`,                      color: T.textMid                      },
                            ].map((s, i) => (
                                <div key={s.label} style={{
                                    padding:     "8px 14px",
                                    background:  T.surface2,
                                    borderTop:   `1px solid ${T.border}`,
                                    borderRight: i < 3 ? `1px solid ${T.border}` : "none",
                                    borderBottom:`1px solid ${T.border}`,
                                    borderLeft:  i === 0 ? `1px solid ${T.border}` : "none",
                                    borderRadius: i === 0 ? "4px 0 0 4px" : i === 3 ? "0 4px 4px 0" : 0,
                                    textAlign:   "center",
                                    minWidth:    64,
                                }}>
                                    <div style={{ fontSize: 9, fontFamily: T.mono, color: T.textDim, letterSpacing: "0.1em", marginBottom: 2 }}>
                                        {s.label}
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: T.mono, color: s.color }}>
                                        {s.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tab nav ───────────────────────────────────────────────────── */}
            <div style={{
                background:   T.surface,
                borderBottom: `1px solid ${T.border}`,
                padding:      "0 24px",
            }} className="no-print">
                <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 4, overflowX: "auto", paddingTop: 8, paddingBottom: 0 }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>
                            {t.label}
                            {t.id === "report" && sessionStats && (
                                <span style={{
                                    marginLeft:   4,
                                    width:        6, height: 6,
                                    borderRadius: "50%",
                                    background:   T.ok,
                                    display:      "inline-block",
                                    verticalAlign:"middle",
                                }} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Main content ──────────────────────────────────────────────── */}
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px" }}>

                {/* ════════ MONITOR TAB ════════ */}
                {activeTab === "monitor" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

                        {/* LEFT column */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                            {/* Camera panel */}
                            <Panel glow={isRunning ? (currentAlert ? currentAlert.color : T.ok) : undefined}>
                                <PanelHeader
                                    label="Webcam — Face Landmark Detection"
                                    right={
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {isRunning && (
                                                <span style={{
                                                    fontSize:   10,
                                                    fontFamily: T.mono,
                                                    color:      T.ok,
                                                    background: T.okDim,
                                                    border:     `1px solid ${T.ok}30`,
                                                    padding:    "2px 8px",
                                                    borderRadius: 3,
                                                }}>{fps} FPS</span>
                                            )}
                                            <button
                                                onClick={isRunning ? stopCamera : startCamera}
                                                disabled={isLoading}
                                                style={{
                                                    padding:      "5px 14px",
                                                    borderRadius: 4,
                                                    fontSize:     11,
                                                    fontWeight:   700,
                                                    fontFamily:   T.mono,
                                                    cursor:       isLoading ? "wait" : "pointer",
                                                    border:       `1px solid ${isRunning ? T.crit + "40" : T.ok + "40"}`,
                                                    background:   isRunning ? T.critDim : T.okDim,
                                                    color:        isRunning ? T.crit    : T.ok,
                                                    letterSpacing:"0.04em",
                                                }}
                                            >
                                                {isLoading ? "LOADING…" : isRunning ? "■  STOP" : "▶  START"}
                                            </button>
                                        </div>
                                    }
                                />

                                {/* Video + canvas */}
                                <div style={{ position: "relative", background: "#000", aspectRatio: "4/3", borderRadius: "0 0 5px 5px", overflow: "hidden" }}>
                                    <video
                                        ref={videoRef}
                                        id="driver-safety-video"
                                        autoPlay muted playsInline
                                        style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", transform: "scaleX(-1)" }}
                                    />

                                    {/* Offline overlay */}
                                    {!isRunning && !isLoading && !cameraError && (
                                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.82)" }}>
                                            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>◎</div>
                                            <p style={{ color: T.textMid, fontSize: 13, fontWeight: 600, margin: "0 0 4px", fontFamily: T.mono }}>Camera Inactive</p>
                                            <p style={{ color: T.textDim, fontSize: 11, margin: 0 }}>Press START to begin monitoring</p>
                                        </div>
                                    )}

                                    {/* Loading overlay */}
                                    {isLoading && (
                                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.88)" }}>
                                            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${T.amber}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite", marginBottom: 10 }} />
                                            <p style={{ color: T.amber, fontSize: 12, fontFamily: T.mono }}>Loading MediaPipe…</p>
                                        </div>
                                    )}

                                    {/* Error overlay */}
                                    {cameraError && (
                                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.88)", padding: 24 }}>
                                            <div style={{ fontSize: 28, marginBottom: 8 }}>⚠</div>
                                            <p style={{ color: T.crit, fontSize: 13, fontWeight: 700, margin: "0 0 4px", fontFamily: T.mono }}>CAMERA ERROR</p>
                                            <p style={{ color: T.textMid, fontSize: 11, textAlign: "center", maxWidth: 240, marginBottom: 12 }}>{cameraError}</p>
                                            <button onClick={startCamera} style={btnStyle()}>RETRY</button>
                                        </div>
                                    )}

                                    {/* Live overlays */}
                                    {isRunning && faceData && (
                                        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                                            {[
                                                { label: "EAR",  val: ear.toFixed(3),           color: ear < 0.25 ? T.crit : T.amber  },
                                                { label: "MAR",  val: mar.toFixed(3),           color: mar > 0.5  ? T.warn : T.ok     },
                                                { label: "YAW",  val: `${yaw.toFixed(1)}°`,     color: Math.abs(yaw) > 15 ? T.warn : T.textMid },
                                                { label: "EYES", val: isClosed ? "CLOSED" : "OPEN", color: isClosed ? T.crit : T.ok   },
                                            ].map(m => (
                                                <div key={m.label} style={{
                                                    display:     "flex",
                                                    alignItems:  "center",
                                                    gap:         6,
                                                    padding:     "3px 8px",
                                                    borderRadius: 3,
                                                    background:  "rgba(13,17,23,0.88)",
                                                    border:      `1px solid ${m.color}28`,
                                                    backdropFilter: "blur(4px)",
                                                }}>
                                                    <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono }}>{m.label}</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: T.mono, color: m.color }}>{m.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Panel>

                            {/* Session-ended banner */}
                            {sessionEnded && !isRunning && sessionStats && (
                                <div style={{
                                    display:      "flex",
                                    alignItems:   "center",
                                    justifyContent:"space-between",
                                    gap:          12,
                                    padding:      "12px 16px",
                                    background:   T.okDim,
                                    border:       `1px solid ${T.ok}35`,
                                    borderRadius: 5,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ fontSize: 18 }}>✓</span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: T.ok }}>SESSION ENDED</p>
                                            <p style={{ margin: 0, fontSize: 11, color: T.textMid, marginTop: 2 }}>
                                                Duration: {fmtDuration(sessionStats.duration_seconds)} · Alerts: {alertHistory.length} · Fatigue: {fatigue}%
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab("report")}
                                        style={btnStyle()}
                                    >
                                        VIEW REPORT →
                                    </button>
                                </div>
                            )}

                            {/* EAR chart */}
                            <Panel>
                                <PanelHeader label="EAR — Eye Aspect Ratio  (live · 3s window)" />
                                <div style={{ padding: "12px 14px 6px" }}>
                                    <div style={{ height: 100 }}>
                                        <EARChart earHistory={earChartData.length > 0 ? earChartData : Array(30).fill({ ear: 0.3 })} />
                                    </div>
                                    <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            <div style={{ width: 16, height: 2, background: T.amber }} />
                                            <span style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono }}>EAR</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            <div style={{ width: 16, height: 1, background: T.crit + "88", borderTop: "1px dashed" }} />
                                            <span style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono }}>Threshold 0.25</span>
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                        </div>

                        {/* RIGHT column */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                            {/* Active alert */}
                            <Panel glow={currentAlert?.color}>
                                <PanelHeader label="Active Alert" />
                                <div style={{ padding: "10px 10px 4px" }}>
                                    <AlertBanner alert={currentAlert} />
                                </div>
                                <div style={{ marginTop: 4 }}>
                                    {[
                                        { key: "sleep_detected",  label: "Drowsiness",  color: T.crit, val: faceData?.sleep_detected  },
                                        { key: "sleepy_detected", label: "Sleepy",      color: T.warn, val: faceData?.sleepy_detected  },
                                        { key: "yawn_detected",   label: "Yawning",     color: T.warn, val: faceData?.yawn_detected    },
                                        { key: "focus_alert",     label: "Inattention", color: T.warn, val: faceData?.focus_alert      },
                                        { key: "face_detected",   label: "Face Found",  color: T.ok,   val: faceData?.face_detected    },
                                    ].map(s => <StateRow key={s.key} label={s.label} active={!!s.val} color={s.color} />)}
                                </div>
                            </Panel>

                            {/* Fatigue score */}
                            <Panel glow={fatigueColor}>
                                <PanelHeader label="Fatigue Score" color={fatigueColor} />
                                <div style={{ padding: "12px 0 4px" }}>
                                    <FatigueBar score={fatigue} color={fatigueColor} />
                                </div>
                                <p style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, padding: "0 14px 10px", margin: 0 }}>
                                    analytics_engine.py · multi-factor weighted formula
                                </p>
                            </Panel>

                            {/* Session stats */}
                            <Panel>
                                <PanelHeader label="Session Statistics" />
                                {[
                                    { l: "Duration",      v: fmtDuration(sessionStats?.duration_seconds), c: T.text  },
                                    { l: "Blink Count",   v: `${sessionStats?.blink_count ?? 0}`,         c: T.amber },
                                    { l: "Blink Rate",    v: `${sessionStats?.blink_rate ?? 0}/min`,       c: T.amber },
                                    { l: "Yawns",         v: `${sessionStats?.yawn_count ?? 0}`,           c: T.warn  },
                                    { l: "Drowsy Events", v: `${sessionStats?.drowsy_events ?? 0}`,        c: T.crit  },
                                    { l: "Lapses",        v: `${sessionStats?.attention_lapses ?? 0}`,     c: T.warn  },
                                    { l: "Long Blinks",   v: `${sessionStats?.long_blinks ?? 0}`,          c: T.purple},
                                ].map(s => <MetricRow key={s.l} label={s.l} value={s.v} color={s.c} />)}
                            </Panel>

                            {/* Alert history */}
                            <Panel>
                                <PanelHeader label={`Alert History  (${alertHistory.length})`} />
                                <div style={{ maxHeight: 180, overflowY: "auto" }}>
                                    {alertHistory.length === 0 ? (
                                        <p style={{ fontSize: 11, color: T.textDim, textAlign: "center", padding: "16px 0", fontFamily: T.mono }}>No alerts yet</p>
                                    ) : alertHistory.map((a, i) => (
                                        <div key={i} style={{
                                            display:     "flex",
                                            alignItems:  "center",
                                            gap:         8,
                                            padding:     "7px 14px",
                                            borderBottom:`1px solid ${T.border}`,
                                            background:  i % 2 === 0 ? "transparent" : T.surface2,
                                        }}>
                                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: T.mono, color: a.color, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                                    {a.type.replace(/_/g, " ")}
                                                </div>
                                                <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono }}>
                                                    {new Date(a.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        </div>
                    </div>
                )}

                {/* ════════ ANALYTICS TAB ════════ */}
                {activeTab === "analytics" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* Stat cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                            {[
                                { label: "Fatigue Score",    value: `${fatigue}%`,                           color: fatigueColor, icon: "◉", desc: "Multi-factor weighted formula" },
                                { label: "Blink Rate",       value: `${sessionStats?.blink_rate ?? 0}/min`,  color: T.amber,      icon: "◎", desc: "Normal: 15–20 blinks/min" },
                                { label: "Drowsy Events",    value: `${sessionStats?.drowsy_events ?? 0}`,   color: T.crit,       icon: "⚠", desc: "Rising-edge sleep_detected triggers" },
                                { label: "Attention Lapses", value: `${sessionStats?.attention_lapses ?? 0}`,color: T.warn,       icon: "◈", desc: "Head yaw >15° for 4s" },
                            ].map(m => (
                                <Panel key={m.label} glow={m.color}>
                                    <div style={{ padding: "14px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                            <span style={{ fontSize: 18, color: m.color }}>{m.icon}</span>
                                            <span style={{ fontSize: 10, fontFamily: T.mono, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>{m.label}</span>
                                        </div>
                                        <div style={{ fontSize: 26, fontWeight: 900, fontFamily: T.mono, color: m.color, marginBottom: 4 }}>{m.value}</div>
                                        <div style={{ fontSize: 10, color: T.textDim }}>{m.desc}</div>
                                    </div>
                                </Panel>
                            ))}
                        </div>

                        {/* Full metrics table */}
                        <Panel>
                            <PanelHeader label="Complete Session Metrics" />
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                            {["Metric", "Value", "Source Module"].map(h => (
                                                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontFamily: T.mono, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { metric: "avg_ear",          value: ear.toFixed(4),                          src: "face_monitor.py → computeEAR()"          },
                                            { metric: "mar",              value: mar.toFixed(4),                          src: "face_monitor.py → computeMAR()"          },
                                            { metric: "yaw (degrees)",    value: `${yaw.toFixed(2)}°`,                    src: "face_monitor.py → estimate_head_pose()"  },
                                            { metric: "blink_count",      value: sessionStats?.blink_count ?? 0,          src: "face_monitor.py → _update_eye_state()"   },
                                            { metric: "blink_rate",       value: `${sessionStats?.blink_rate ?? 0}/min`,  src: "analytics_engine.py → getSessionSummary()"},
                                            { metric: "long_blinks",      value: sessionStats?.long_blinks ?? 0,          src: "analytics_engine.py → metrics.long_blinks"},
                                            { metric: "yawn_count",       value: sessionStats?.yawn_count ?? 0,           src: "analytics_engine.py → metrics.yawn_count" },
                                            { metric: "drowsy_events",    value: sessionStats?.drowsy_events ?? 0,        src: "analytics_engine.py → metrics.drowsy_events"},
                                            { metric: "attention_lapses", value: sessionStats?.attention_lapses ?? 0,     src: "analytics_engine.py → metrics.attention_lapses"},
                                            { metric: "fatigue_score",    value: `${fatigue}%`,                           src: "analytics_engine.py → calculateFatigueScore()"},
                                        ].map((row, i) => (
                                            <tr key={row.metric} style={{ background: i % 2 === 0 ? "transparent" : T.surface2, borderBottom: `1px solid ${T.border}` }}>
                                                <td style={{ padding: "8px 16px" }}><code style={{ color: T.amber, fontSize: 11, fontFamily: T.mono }}>{row.metric}</code></td>
                                                <td style={{ padding: "8px 16px", fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.text }}>{String(row.value)}</td>
                                                <td style={{ padding: "8px 16px", fontSize: 11, color: T.textDim }}>{row.src}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>

                        {/* Pipeline */}
                        <Panel>
                            <PanelHeader label="Data Pipeline" color={T.blue} />
                            <div style={{ padding: "14px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                                {[
                                    { step: "01", label: "Webcam Frame",              color: "#6366f1" },
                                    { step: "02", label: "MediaPipe FaceMesh",        color: "#8b5cf6" },
                                    { step: "03", label: "FaceMonitor (EAR/MAR/Yaw)", color: T.amber  },
                                    { step: "04", label: "AlertManager",              color: T.warn   },
                                    { step: "05", label: "AnalyticsEngine",           color: T.ok     },
                                    { step: "06", label: "SensorContext",             color: T.purple },
                                    { step: "07", label: "AuraContext + Models",       color: T.crit   },
                                ].map((s, i, arr) => (
                                    <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{
                                                width: 38, height: 38, borderRadius: 4,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 11, fontWeight: 800, fontFamily: T.mono,
                                                background: s.color + "15",
                                                border: `1px solid ${s.color}35`,
                                                color: s.color,
                                            }}>{s.step}</div>
                                            <div style={{ fontSize: 9, color: T.textDim, marginTop: 4, maxWidth: 60, lineHeight: 1.3 }}>{s.label}</div>
                                        </div>
                                        {i < arr.length - 1 && <span style={{ color: T.border2, fontSize: 12 }}>→</span>}
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </div>
                )}

                {/* ════════ SETUP TAB ════════ */}
                {activeTab === "setup" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <Panel>
                            <PanelHeader label="Active Thresholds — mirrors config/settings.json" />
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                            {["Parameter", "Value", "Description"].map(h => (
                                                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontFamily: T.mono, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { p: "ear_threshold",         v: "0.25",   d: "EAR below = eye considered closed" },
                                            { p: "sleep_time",            v: "4.0 s",  d: "Eye closure duration → DROWSINESS" },
                                            { p: "mar_threshold",         v: "0.50",   d: "MAR above = mouth open (yawn)" },
                                            { p: "yawn_time",             v: "3.0 s",  d: "Mouth open duration → YAWN alert" },
                                            { p: "yaw_threshold_degrees", v: "15°",    d: "Max head yaw before inattention" },
                                            { p: "inattention_time",      v: "4.0 s",  d: "Head away → FOCUS alert" },
                                            { p: "sleepy_window",         v: "30.0 s", d: "Rolling window for long-blink detection" },
                                            { p: "sleepy_blink_count",    v: "4",      d: "Long blinks in window → SLEEPY" },
                                            { p: "long_blink_min",        v: "0.40 s", d: "Min duration for a long blink" },
                                            { p: "long_blink_max",        v: "1.50 s", d: "Max duration for a long blink" },
                                        ].map((t, i) => (
                                            <tr key={t.p} style={{ background: i % 2 === 0 ? "transparent" : T.surface2, borderBottom: `1px solid ${T.border}` }}>
                                                <td style={{ padding: "9px 16px" }}><code style={{ color: T.amber, fontSize: 11, fontFamily: T.mono }}>{t.p}</code></td>
                                                <td style={{ padding: "9px 16px" }}>
                                                    <span style={{ padding: "2px 8px", borderRadius: 3, fontSize: 11, fontFamily: T.mono, background: T.amberDim, color: T.amber, border: `1px solid ${T.amberBdr}` }}>{t.v}</span>
                                                </td>
                                                <td style={{ padding: "9px 16px", fontSize: 11, color: T.textMid }}>{t.d}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>

                        <Panel>
                            <PanelHeader label="Fatigue Score Formula — analytics_engine.py" color={T.ok} />
                            <pre style={{ margin: 0, padding: "14px 16px", fontSize: 12, fontFamily: T.mono, color: T.ok, background: "rgba(0,0,0,0.4)", borderRadius: "0 0 5px 5px", overflowX: "auto" }}>{`fatigue_score = (
  drowsy_events   × 30
  + yawn_count    × 10
  + attn_lapses   × 15
  + long_blinks   ×  5
  + low_blink_pen × 10  // if blink_rate < 10/min
) ÷ duration_minutes`}</pre>
                        </Panel>
                    </div>
                )}

                {/* ════════ REPORT TAB ════════ */}
                {activeTab === "report" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {!sessionStats ? (
                            <Panel>
                                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                                    <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📋</div>
                                    <p style={{ color: T.textMid, fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>No session data yet</p>
                                    <p style={{ color: T.textDim, fontSize: 12, margin: "0 0 16px" }}>Start and stop a monitoring session to generate a report</p>
                                    <button onClick={() => setActiveTab("monitor")} style={btnStyle()}>GO TO MONITOR →</button>
                                </div>
                            </Panel>
                        ) : (
                            <>
                                {/* Report action bar */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }} className="no-print">
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: T.mono, color: T.text }}>Session Report</h2>
                                        <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textDim, fontFamily: T.mono }}>
                                            Generated {new Date().toLocaleString()}
                                        </p>
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            onClick={() => exportJSON(sessionStats, alertHistory)}
                                            style={btnStyle("secondary")}
                                        >📥 Export JSON</button>
                                        <button
                                            onClick={() => window.print()}
                                            style={btnStyle("primary")}
                                        >🖨️ Print Report</button>
                                    </div>
                                </div>

                                {/* Session summary */}
                                <Panel>
                                    <PanelHeader label="Session Summary" />
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 1, padding: 1, background: T.border }}>
                                        {[
                                            { label: "Duration",       value: fmtDuration(sessionStats.duration_seconds),     color: T.text   },
                                            { label: "Fatigue Score",  value: `${fatigue}%`,                                  color: fatigueColor },
                                            { label: "Blink Count",    value: `${sessionStats.blink_count ?? 0}`,             color: T.amber  },
                                            { label: "Blink Rate",     value: `${sessionStats.blink_rate ?? 0}/min`,          color: T.amber  },
                                            { label: "Yawns",          value: `${sessionStats.yawn_count ?? 0}`,              color: T.warn   },
                                            { label: "Drowsy Events",  value: `${sessionStats.drowsy_events ?? 0}`,           color: T.crit   },
                                            { label: "Attn. Lapses",   value: `${sessionStats.attention_lapses ?? 0}`,        color: T.warn   },
                                            { label: "Long Blinks",    value: `${sessionStats.long_blinks ?? 0}`,             color: T.purple },
                                            { label: "Total Alerts",   value: `${alertHistory.length}`,                       color: alertHistory.length > 0 ? T.crit : T.ok },
                                        ].map(s => (
                                            <div key={s.label} style={{ background: T.surface, padding: "12px 16px" }}>
                                                <div style={{ fontSize: 9, fontFamily: T.mono, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                                                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: T.mono, color: s.color }}>{s.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </Panel>

                                {/* Risk assessment */}
                                <Panel>
                                    <PanelHeader label="Risk Assessment" color={fatigueColor} />
                                    <div style={{ padding: "14px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                                            <div style={{
                                                width: 56, height: 56, borderRadius: 6,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                background: fatigueColor + "14",
                                                border: `2px solid ${fatigueColor}35`,
                                                fontSize: 24, fontWeight: 900, fontFamily: T.mono,
                                                color: fatigueColor,
                                            }}>{fatigue}</div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: fatigueColor, fontFamily: T.mono }}>{fatigueScoreToLabel(fatigue)}</div>
                                                <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>
                                                    {fatigue < 30 ? "Driver appears alert. Continue monitoring." :
                                                     fatigue < 60 ? "Mild fatigue signs detected. Consider a short break." :
                                                     fatigue < 80 ? "Significant fatigue detected. Stop and rest." :
                                                                    "CRITICAL — Immediate rest required. Do not drive."}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: T.border, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${fatigue}%`, background: `linear-gradient(90deg, ${T.ok}, ${T.warn}, ${T.crit})`, transition: "width 0.5s" }} />
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                            {["SAFE", "MILD", "DROWSY", "CRITICAL"].map(l => (
                                                <span key={l} style={{ fontSize: 9, fontFamily: T.mono, color: T.textDim }}>{l}</span>
                                            ))}
                                        </div>
                                    </div>
                                </Panel>

                                {/* Alert history table */}
                                <Panel>
                                    <PanelHeader label={`Alert History  (${alertHistory.length} events)`} />
                                    {alertHistory.length === 0 ? (
                                        <p style={{ padding: "20px 16px", fontSize: 12, color: T.textDim, textAlign: "center", fontFamily: T.mono }}>No alerts recorded this session — excellent!</p>
                                    ) : (
                                        <div style={{ overflowX: "auto" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                                <thead>
                                                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                                        {["#", "Alert Type", "Message", "Time"].map(h => (
                                                            <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontFamily: T.mono, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {alertHistory.map((a, i) => (
                                                        <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : T.surface2, borderBottom: `1px solid ${T.border}` }}>
                                                            <td style={{ padding: "8px 14px", fontFamily: T.mono, fontSize: 10, color: T.textDim }}>{alertHistory.length - i}</td>
                                                            <td style={{ padding: "8px 14px" }}>
                                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, display: "inline-block" }} />
                                                                    <code style={{ fontSize: 10, fontFamily: T.mono, color: a.color }}>{a.type}</code>
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: "8px 14px", fontSize: 11, color: T.textMid }}>{a.message}</td>
                                                            <td style={{ padding: "8px 14px", fontFamily: T.mono, fontSize: 10, color: T.textDim }}>{new Date(a.timestamp).toLocaleTimeString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Panel>

                                {/* Print footer (only shown in print) */}
                                <div className="print-only" style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #ccc", fontSize: 11, color: "#666" }}>
                                    <strong>Driver Safety Monitor Report</strong> — Generated {new Date().toLocaleString()} by MindGuard.ai
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 24px 24px" }} className="no-print">
                <div style={{
                    display:       "flex",
                    alignItems:    "center",
                    justifyContent:"space-between",
                    padding:       "12px 0",
                    borderTop:     `1px solid ${T.border}`,
                    gap:           12,
                    flexWrap:      "wrap",
                }}>
                    <div style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>
                        <span style={{ color: T.textMid }}>DRIVER SAFETY MONITOR</span> · FaceMonitor · AlertManager · AnalyticsEngine<br />
                        Live browser implementation · same models as Python project
                    </div>
                    <a href="https://github.com/DepthStrider-x/Driver-Safety-Monitor"
                        target="_blank" rel="noopener noreferrer"
                        style={{
                            fontSize: 11, padding: "5px 12px", borderRadius: 4,
                            background: T.surface2, color: T.textMid,
                            border: `1px solid ${T.border2}`, textDecoration: "none",
                            fontFamily: T.mono,
                        }}>
                        Python Project ↗
                    </a>
                </div>
            </div>
        </div>
    );
}
