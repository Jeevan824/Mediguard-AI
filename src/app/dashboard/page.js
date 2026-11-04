"use client";
import { useEffect, useRef, useState } from "react";
import { useSensor } from "@/context/SensorContext";
import { useDataset } from "@/context/DatasetContext";
import { useAura } from "@/context/AuraContext";
import { useHealth } from "@/context/HealthContext";
import { usePersonalization } from "@/context/PersonalizationContext";
import {
    initFaceDetection, calculateEAR, estimateHeadPose,
    EARSmoother, BlinkDetector, drawLandmarks,
} from "@/lib/faceDetection";
import { calculateCognitiveLoad } from "@/lib/cognitiveLoad";
import { computeWellness } from "@/lib/wellnessScorer";
import { TypingTracker } from "@/lib/typingTracker";
import { FEATURES } from "@/config/features";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";
import ScreenDistanceAlert from "@/components/health/ScreenDistanceAlert";
import AuraOrb from "@/components/aura/AuraOrb";
import MetricRing from "@/components/aura/MetricRing";
import AuraCard, { AuraCardHeader } from "@/components/aura/AuraCard";
import { scoreToColor } from "@/config/auraTheme";
import SleepTracker from "@/components/health/SleepTracker";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS, CategoryScale, LinearScale,
    PointElement, LineElement, Filler, Tooltip,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export default function DashboardPage() {
    return <DashboardContent />;
}

function DashboardContent() {
    const sensor = useSensor();
    const { demoMode, currentRow } = useDataset();
    const demoModeRef = useRef(demoMode);
    demoModeRef.current = demoMode;
    const { wellness, updateWellness, cognitiveState, stateColor, logEvent } = useAura();
    const { updateBaseline, deviations, burnoutRisk7d } = usePersonalization();
    const { movementBreaks } = useHealth();

    // ── Persist session + snapshots to Supabase (silent no-op if not authed) ──
    useSessionPersistence();

    const videoRef            = useRef(null);
    const canvasRef           = useRef(null);
    const blinkDetectorRef    = useRef(null);
    const earSmootherRef      = useRef(null);
    const cleanupRef          = useRef(null);
    const fpsIntervalRef      = useRef(null);
    const wellnessIntervalRef = useRef(null);
    const baselineIntervalRef = useRef(null);
    const snapshotIntervalRef = useRef(null);
    const typingTrackerRef    = useRef(null);

    const [fps, setFps]                   = useState(0);
    const [landmarkCount, setLandmarkCount] = useState(0);
    const [cameraError, setCameraError]   = useState(null);
    const frameCountRef = useRef(0);
    const [stressHistory, setStressHistory] = useState(Array(20).fill(0));
    const [timeLabels, setTimeLabels]       = useState(Array(20).fill(""));

    // ── Start typing + mouse trackers on mount ────────────────────────────────
    useEffect(() => {
        // Typing tracker (8s window)
        if (!typingTrackerRef.current) {
            typingTrackerRef.current = new TypingTracker(8000);
            typingTrackerRef.current.start(({ wpm, totalChars, ikiVariance, errorRate }) => {
                if (demoModeRef.current) return;
                sensor.setTypingWPM(wpm);
                sensor.setTotalKeystrokes(totalChars);
                sensor.setIkiVariance(ikiVariance);
                sensor.setErrorRate(errorRate);
            });
        }
        return () => {
            typingTrackerRef.current?.stop();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Compute wellness every 1 second ───────────────────────────────────────
    useEffect(() => {
        wellnessIntervalRef.current = setInterval(() => {
            if (demoModeRef.current) return;
            const metrics = computeWellness(
                {
                    eyeAspectRatio:  sensor.eyeAspectRatio,
                    blinkRate:       sensor.blinkRate,
                    blinkCount:      sensor.blinkCount,
                    typingWPM:       sensor.typingWPM,
                    mouseIntensity:  sensor.mouseIntensity,
                    mouseActive:     sensor.mouseActive,
                    mouseSpeed:      sensor.mouseSpeed,
                    stressLevel:     sensor.stressLevel,
                    cognitiveLoad:   sensor.cognitiveLoad,
                    sessionStart:    sensor.sessionStart,
                    ikiVariance:     sensor.ikiVariance,
                    errorRate:       sensor.errorRate,
                    jerkiness:       sensor.jerkiness,
                    idlePauses:      sensor.idlePauses,
                    headYaw:         sensor.headYaw,
                    headPitch:       sensor.headPitch,
                    headDistraction: sensor.headDistraction,
                },
                { typingWPM: 50 },
                burnoutRisk7d
            );
            updateWellness(metrics);

            // Push to 60-point chart history
            const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            setStressHistory((prev) => [...prev.slice(-19), sensor.stressLevel]);
            setTimeLabels((prev)    => [...prev.slice(-19), now]);

            sensor.pushChartData(
                sensor.blinkRate,
                sensor.typingWPM,
                sensor.mouseSpeed,
                sensor.stressLevel,
                sensor.cognitiveLoad,
                sensor.eyeAspectRatio,
                metrics.focusScore ?? 0
            );

            // Overload event tracking
            if (sensor.cognitiveLoad >= 70) {
                sensor.setOverloadEvents((p) => p + 1);
            }
        }, 1000); // ← 1 second (was 3s)

        // Baseline learning every 60 seconds
        baselineIntervalRef.current = setInterval(() => {
            updateBaseline({
                blinkRate:   sensor.blinkRate,
                typingWPM:   sensor.typingWPM,
                mouseSpeed:  sensor.mouseSpeed,
                stressLevel: sensor.stressLevel,
            });
        }, 60000);

        return () => {
            clearInterval(wellnessIntervalRef.current);
            clearInterval(baselineIntervalRef.current);
        };
    }, [sensor, burnoutRisk7d, updateWellness, updateBaseline]);

    // ── Session snapshot every 5s ─────────────────────────────────────────────
    useEffect(() => {
        snapshotIntervalRef.current = setInterval(() => {
            if (demoModeRef.current) return;
            sensor.pushSessionSnapshot({
                timestamp:       Date.now(),
                sessionMinutes:  Math.round((Date.now() - sensor.sessionStart) / 60000 * 10) / 10,
                stressLevel:     sensor.stressLevel,
                cognitiveLoad:   sensor.cognitiveLoad,
                cognitiveLabel:  sensor.cognitiveLabel,
                blinkRate:       sensor.blinkRate,
                eyeAspectRatio:  sensor.eyeAspectRatio,
                typingWPM:       sensor.typingWPM,
                ikiVariance:     sensor.ikiVariance,
                errorRate:       sensor.errorRate,
                mouseIntensity:  sensor.mouseIntensity,
                mouseSpeed:      sensor.mouseSpeed,
                jerkiness:       sensor.jerkiness,
                idlePauses:      sensor.idlePauses,
                headYaw:         sensor.headYaw,
                headPitch:       sensor.headPitch,
                headDistraction: sensor.headDistraction,
            });
        }, 5000);
        return () => clearInterval(snapshotIntervalRef.current);
    }, [sensor]);

    // ── Camera start / stop ───────────────────────────────────────────────────
    const startCamera = async () => {
        if (sensor.isCameraActive) return;
        setCameraError(null);
        try {
            if (!blinkDetectorRef.current) blinkDetectorRef.current = new BlinkDetector(0.2, 2, 8);
            if (!earSmootherRef.current)   earSmootherRef.current   = new EARSmoother(0.3);

            fpsIntervalRef.current = setInterval(() => {
                setFps(frameCountRef.current);
                frameCountRef.current = 0;
            }, 1000);

            const cleanup = await initFaceDetection(videoRef.current, (results) => {
                frameCountRef.current++;
                if (demoModeRef.current) return;
                if (!results.multiFaceLandmarks?.length) {
                    sensor.setFaceLandmarks(null); setLandmarkCount(0); return;
                }
                const landmarks = results.multiFaceLandmarks[0];
                sensor.setFaceLandmarks(landmarks);
                setLandmarkCount(landmarks.length);

                if (canvasRef.current) {
                    const c = canvasRef.current;
                    drawLandmarks(c.getContext("2d"), landmarks, c.width, c.height);
                }

                // EAR + blink
                const rawEAR    = calculateEAR(landmarks);
                const smoothed  = earSmootherRef.current.update(rawEAR);
                sensor.setEyeAspectRatio(parseFloat(smoothed.toFixed(3)));
                blinkDetectorRef.current.update(smoothed);
                sensor.setBlinkCount(blinkDetectorRef.current.getTotalBlinks());
                sensor.setBlinkConfidence(blinkDetectorRef.current.getAvgConfidence());
                const bpm = blinkDetectorRef.current.getBlinksPerMinute();
                sensor.setBlinkRate(bpm);

                // Head pose
                const { pitch, yaw, distraction } = estimateHeadPose(landmarks);
                sensor.setHeadYaw(yaw);
                sensor.setHeadPitch(pitch);
                sensor.setHeadDistraction(distraction);

                // Cognitive load (5-signal)
                const { load, label, stress, breakdown } = calculateCognitiveLoad(
                    bpm, sensor.typingWPM, smoothed, sensor.mouseIntensity, 50,
                    {
                        ikiVariance:     sensor.ikiVariance,
                        errorRate:       sensor.errorRate,
                        headDistraction: distraction,
                        jerkiness:       sensor.jerkiness,
                    }
                );
                sensor.setCognitiveLoad(load);
                sensor.setCognitiveLabel(label);
                sensor.setStressLevel(stress);
                sensor.setCliBreakdown(breakdown);
            });

            cleanupRef.current = cleanup;
            sensor.setIsCameraActive(true);
            logEvent("camera", "Camera started");
        } catch (err) {
            setCameraError("Camera access denied. Please allow webcam permissions.");
        }
    };

    const stopCamera = () => {
        if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
        if (fpsIntervalRef.current) { clearInterval(fpsIntervalRef.current); fpsIntervalRef.current = null; }
        sensor.setIsCameraActive(false); sensor.setFaceLandmarks(null);
        setLandmarkCount(0); setFps(0);
        const c = canvasRef.current;
        if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
        logEvent("camera", "Camera stopped");
    };

    useEffect(() => () => {
        if (cleanupRef.current) cleanupRef.current();
        if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
    }, []);

    const dims = [
        { label: "Stress",       value: wellness.stressScore,  color: scoreToColor(100 - wellness.stressScore),  invert: true },
        { label: "Fatigue",      value: wellness.fatigueScore, color: scoreToColor(100 - wellness.fatigueScore), invert: true },
        { label: "Focus",        value: wellness.focusScore,   color: scoreToColor(wellness.focusScore) },
        { label: "Energy",       value: wellness.energyLevel,  color: scoreToColor(wellness.energyLevel) },
        { label: "Burnout Risk", value: wellness.burnoutRisk,  color: scoreToColor(100 - wellness.burnoutRisk),  invert: true },
        { label: "Recovery Need",value: wellness.recoveryNeed, color: scoreToColor(100 - wellness.recoveryNeed), invert: true },
    ];

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 200 },
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#4b5563", font: { size: 9 }, maxTicksLimit: 6 } },
            y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#4b5563", font: { size: 9 } }, beginAtZero: true, max: 100 },
        },
    };

    const sessionMins = Math.floor((Date.now() - sensor.sessionStart) / 60000);

    // ── design tokens ──────────────────────────────────────────────────────────
    const T = {
        bg: "#0d1117", surface: "#161b22", border: "#21262d", border2: "#30363d",
        text: "#e6edf3", textMid: "#8b949e", textDim: "#484f58",
        amber: "#e6a817", ok: "#3fb950", warn: "#d29922", crit: "#da3633",
        mono: "'JetBrains Mono','Courier New',monospace",
        sans: "'Inter',system-ui,sans-serif",
    };

    const cardStyle = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" };
    const hdrStyle  = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: `1px solid ${T.border}`, background: T.bg };
    const hdrLabel  = { fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.amber };

    return (
        <div className="page-container">
            {/* ── Header ── */}
            <div className="page-header" style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 900, color: T.text, letterSpacing: "-0.02em", marginBottom: 4 }}>
                            Live <span style={{ color: T.amber }}>Dashboard</span>
                        </h1>
                        <p style={{ color: T.textMid, fontSize: 13 }}>Real-time cognitive wellness monitoring · 1 s update rate</p>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        {deviations.length > 0 && (
                            <div style={{ padding: "5px 12px", borderRadius: 4, fontSize: 11, fontFamily: T.mono, color: T.warn, background: "rgba(210,153,34,0.08)", border: `1px solid rgba(210,153,34,0.22)` }}>
                                ⚡ {deviations[0]}
                            </div>
                        )}
                        <a href="/powerbi" style={{
                            padding: "5px 12px", borderRadius: 4, fontSize: 11, fontFamily: T.mono,
                            color: T.amber, background: T.amber + "10", border: `1px solid ${T.amber}30`,
                            textDecoration: "none", fontWeight: 700,
                        }}>
                            ▤ Power BI →
                        </a>
                    </div>
                </div>
            </div>

            {demoMode && (
                <div style={{
                    marginBottom: 16, padding: "6px 14px", borderRadius: 4, textAlign: "center",
                    fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    color: T.crit, background: "rgba(218,54,51,0.08)", border: `1px solid rgba(218,54,51,0.28)`,
                }}>
                    ⚠ DEMO DATA — NOT LIVE MEASUREMENTS{currentRow ? ` · ${currentRow.profile} #${currentRow.row_id}` : ""}
                </div>
            )}

            {/* ── Mouse tracking strip ── */}
            <div style={{ ...cardStyle, marginBottom: 14 }}>
                <div style={hdrStyle}>
                    <span style={hdrLabel}>Mouse Tracking</span>
                    <span style={{
                        fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                        padding: "2px 8px", borderRadius: 3,
                        color: sensor.liveMouse.status === "listening" ? T.ok : sensor.liveMouse.status === "error" ? T.crit : T.warn,
                        background: (sensor.liveMouse.status === "listening" ? T.ok : sensor.liveMouse.status === "error" ? T.crit : T.warn) + "18",
                        border: `1px solid ${(sensor.liveMouse.status === "listening" ? T.ok : sensor.liveMouse.status === "error" ? T.crit : T.warn)}35`,
                    }}>
                        {sensor.liveMouse.status === "listening" ? "TRACKING ON" : sensor.liveMouse.status === "error" ? "TRACKING FAILED" : "TRACKING OFF"}
                    </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, borderBottom: `1px solid ${T.border}` }}>
                    {[
                        { l: "Live move",   v: sensor.liveMouse.isActive ? "YES" : "idle" },
                        { l: "Live clicks", v: sensor.liveMouse.clicks },
                        { l: "Intensity",   v: sensor.liveMouse.intensity },
                        { l: "Speed px/s",  v: sensor.liveMouse.speed },
                        { l: "Idle ms",     v: sensor.liveMouse.idleMs },
                    ].map((m, i) => (
                        <div key={m.l} style={{ padding: "10px 8px", textAlign: "center", background: i % 2 === 0 ? "transparent" : T.bg, borderRight: i < 4 ? `1px solid ${T.border}` : "none" }}>
                            <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 900, color: T.text }}>{m.v}</div>
                            <div style={{ fontSize: 9, color: T.textDim, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.l}</div>
                        </div>
                    ))}
                </div>
                {demoMode && (
                    <div style={{ padding: "6px 14px", fontSize: 10, fontFamily: T.mono, color: T.warn + "cc" }}>
                        ↑ Hardware pointer test only — chart data uses CSV record values
                    </div>
                )}
            </div>

            {FEATURES.sleepTracker && <SleepTracker />}

            {/* ── Aura orb + metric rings ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
                <AuraOrb size="xl" showScore showState />
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, marginTop: 28 }}>
                    {dims.map((d, i) => (
                        <MetricRing key={i} label={d.label} value={d.value} color={d.color} size={80} />
                    ))}
                </div>
            </div>

            {/* ── Camera + metrics ── */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, marginBottom: 14 }}>

                {/* Camera */}
                <div style={cardStyle}>
                    <div style={hdrStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                                width: 7, height: 7, borderRadius: "50%",
                                background: sensor.isCameraActive ? T.crit : T.textDim,
                                boxShadow: sensor.isCameraActive ? `0 0 8px ${T.crit}` : "none",
                                animation: sensor.isCameraActive ? "orb-pulse 1.5s ease-in-out infinite" : "none",
                            }} />
                            <span style={hdrLabel}>{sensor.isCameraActive ? "CAMERA LIVE" : "CAMERA OFF"}</span>
                            {sensor.isCameraActive && <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim }}>{fps} FPS</span>}
                            {sensor.isCameraActive && blinkDetectorRef.current?.isCalibrated() && (
                                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.ok }}>✓ CALIBRATED</span>
                            )}
                        </div>
                        <button
                            onClick={sensor.isCameraActive ? stopCamera : startCamera}
                            style={{
                                padding: "4px 14px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer",
                                fontFamily: T.mono, letterSpacing: "0.06em",
                                background: sensor.isCameraActive ? "rgba(218,54,51,0.1)" : "rgba(63,185,80,0.1)",
                                color: sensor.isCameraActive ? T.crit : T.ok,
                                border: `1px solid ${sensor.isCameraActive ? "rgba(218,54,51,0.3)" : "rgba(63,185,80,0.3)"}`,
                            }}
                        >
                            {sensor.isCameraActive ? "⏹ Stop" : "▶ Start Camera"}
                        </button>
                    </div>

                    <div style={{ position: "relative", background: "#000", aspectRatio: "4/3", overflow: "hidden" }}>
                        {/* Amber corner brackets */}
                        {[{t:"0",l:"0",tr:"0",br:"none"},{t:"0",r:"0",tl:"0",bl:"none"},{b:"0",l:"0",br:"0",tr:"none"},{b:"0",r:"0",bl:"0",tl:"none"}].map((c, i) => (
                            <div key={i} style={{
                                position: "absolute", width: 20, height: 20, zIndex: 10, pointerEvents: "none",
                                top: c.t, bottom: c.b, left: c.l, right: c.r,
                                borderTop: c.tr !== undefined ? `2px solid ${T.amber}` : "none",
                                borderBottom: c.br !== undefined ? (c.br === "0" ? `2px solid ${T.amber}` : "none") : (c.b !== undefined ? `2px solid ${T.amber}` : "none"),
                                borderLeft: c.l !== undefined && (c.t !== undefined || c.b !== undefined) ? `2px solid ${T.amber}` : "none",
                                borderRight: c.r !== undefined ? `2px solid ${T.amber}` : "none",
                                margin: 10,
                            }} />
                        ))}
                        <video ref={videoRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} playsInline muted />
                        <canvas ref={canvasRef} width={640} height={480} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 20, transform: "scaleX(-1)" }} />

                        {FEATURES.screenDistanceAlert && (
                            <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, zIndex: 30, padding: "0 12px" }}>
                                <ScreenDistanceAlert />
                            </div>
                        )}

                        {!sensor.isCameraActive && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
                                <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>▣</div>
                                <p style={{ fontSize: 13, color: T.textMid, marginBottom: 4 }}>Camera not active</p>
                                <p style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>click ▶ Start Camera to enable AI detection</p>
                                {cameraError && <p style={{ fontSize: 11, color: T.crit, marginTop: 12, maxWidth: 280, textAlign: "center" }}>{cameraError}</p>}
                            </div>
                        )}

                        {/* Bottom HUD bar */}
                        <div style={{
                            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
                            background: "rgba(0,0,0,0.72)", padding: "5px 12px",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.amber }}>
                                {landmarkCount > 0 ? `${landmarkCount} landmarks` : "No face detected"}
                            </span>
                            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim }}>
                                EAR: {sensor.eyeAspectRatio.toFixed(3)} | Blinks: {sensor.blinkCount} | Yaw: {sensor.headYaw ?? 0}°
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                    {/* Session metrics grid */}
                    <div style={cardStyle}>
                        <div style={hdrStyle}><span style={hdrLabel}>Session Metrics</span></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: T.border }}>
                            {[
                                { l: "Duration",  v: `${sessionMins}m`,                    c: T.text },
                                { l: "Focus",     v: `${wellness.focusScore}%`,             c: T.ok },
                                { l: "Blinks",    v: sensor.blinkCount,                    c: "#56d8e4" },
                                { l: "WPM",       v: sensor.typingWPM,                     c: T.amber },
                                { l: "Clicks",    v: demoMode ? "n/a" : sensor.mouseClicks, c: "#bc8cff" },
                                { l: "Breaks",    v: movementBreaks,                       c: T.ok },
                                { l: "IKI Var",   v: `${sensor.ikiVariance ?? 0}%`,        c: T.warn },
                                { l: "Overloads", v: sensor.overloadEvents,                c: T.crit },
                            ].map((m, i) => (
                                <div key={i} style={{ padding: "10px 8px", textAlign: "center", background: T.surface }}>
                                    <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 900, color: m.c, lineHeight: 1 }}>{m.v}</div>
                                    <div style={{ fontSize: 9, color: T.textDim, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.l}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stress timeline */}
                    <div style={{ ...cardStyle, flex: 1 }}>
                        <div style={hdrStyle}><span style={hdrLabel}>Stress Timeline</span></div>
                        <div style={{ padding: "10px 12px", height: 120 }}>
                            <Line
                                data={{
                                    labels: timeLabels,
                                    datasets: [{
                                        data: stressHistory,
                                        borderColor: stateColor,
                                        backgroundColor: `${stateColor}12`,
                                        fill: true, tension: 0.4, pointRadius: 0,
                                    }],
                                }}
                                options={chartOpts}
                            />
                        </div>
                    </div>

                    {/* Live signals */}
                    <div style={cardStyle}>
                        <div style={hdrStyle}><span style={hdrLabel}>Live Signals</span></div>
                        <div>
                            {[
                                { l: "Blink Rate",   v: `${sensor.blinkRate}/min`,                             ok: sensor.blinkRate <= 25 && sensor.blinkRate >= 10 },
                                { l: "Eye Ratio",    v: sensor.eyeAspectRatio.toFixed(3),                      ok: sensor.eyeAspectRatio >= 0.22 },
                                { l: "Mouse",        v: sensor.mouseActive ? "Active" : "Idle",                ok: sensor.mouseActive },
                                { l: "Cognitive",    v: sensor.cognitiveLabel,                                  ok: sensor.cognitiveLoad < 70 },
                                { l: "Head Pose",    v: `${sensor.headYaw ?? 0}° / ${sensor.headPitch ?? 0}°`, ok: Math.abs(sensor.headYaw ?? 0) < 20 },
                                { l: "IKI Variance", v: `${sensor.ikiVariance ?? 0}%`,                         ok: (sensor.ikiVariance ?? 0) < 50 },
                            ].map((m, i) => (
                                <div key={i} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "7px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11,
                                }}>
                                    <span style={{ color: T.textMid }}>{m.l}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.text }}>{m.v}</span>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.ok ? T.ok : T.crit, boxShadow: `0 0 6px ${m.ok ? T.ok : T.crit}` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
