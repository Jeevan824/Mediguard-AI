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

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                        <span className="aura-gradient-text">Live Dashboard</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Real-time cognitive wellness monitoring · 1s update rate</p>
                </div>
                <div className="flex gap-2">
                    {deviations.length > 0 && (
                        <div className="px-4 py-2 rounded-xl text-xs text-amber-400 border border-amber-500/20 bg-amber-500/5">
                            ⚡ {deviations[0]}
                        </div>
                    )}
                    <a href="/powerbi"
                        className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>
                        📊 Open Power BI Dashboard
                    </a>
                </div>
            </div>

            {demoMode && (
                <div className="mb-4 px-4 py-2 rounded-xl text-center text-[11px] font-bold tracking-widest text-red-200"
                    style={{ background: "rgba(127,29,29,0.45)", border: "1px solid rgba(248,113,113,0.35)" }}>
                    DEMO DATA — NOT LIVE MEASUREMENTS
                    {currentRow ? ` · ${currentRow.profile} #${currentRow.row_id}` : ""}
                </div>
            )}

            <AuraCard padding="p-4" className="mb-5">
                <AuraCardHeader label="Mouse Tracking Test" icon="🖱️" />
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className={`px-2 py-1 rounded-lg font-semibold ${
                        sensor.liveMouse.status === "listening" ? "bg-emerald-500/15 text-emerald-400" :
                        sensor.liveMouse.status === "error" ? "bg-red-500/15 text-red-400" :
                        "bg-amber-500/15 text-amber-400"
                    }`}>
                        {sensor.liveMouse.status === "listening" ? "TRACKING ON" :
                         sensor.liveMouse.status === "error" ? "TRACKING FAILED" :
                         "TRACKING OFF"}
                    </span>
                    <span className="text-gray-500">{sensor.liveMouse.reason}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                    {[
                        { l: "Live move", v: sensor.liveMouse.isActive ? "YES" : "idle" },
                        { l: "Live clicks", v: sensor.liveMouse.clicks },
                        { l: "Intensity", v: sensor.liveMouse.intensity },
                        { l: "Speed px/s", v: sensor.liveMouse.speed },
                        { l: "Idle ms", v: sensor.liveMouse.idleMs },
                    ].map(function(m) {
                        return (
                            <div key={m.l} className="bg-white/[0.04] rounded-lg p-2 text-center">
                                <div className="text-sm font-bold text-white font-mono">{m.v}</div>
                                <div className="text-[9px] text-gray-500 uppercase">{m.l}</div>
                            </div>
                        );
                    })}
                </div>
                {demoMode && (
                    <p className="text-[10px] text-amber-400/80 mt-2">
                        These live pointer counts are a hardware test only. Dashboard cards below use the selected CSV record, not these numbers.
                    </p>
                )}
            </AuraCard>

            {FEATURES.sleepTracker && <SleepTracker />}

            {/* Central orb + metric rings */}
            <div className="flex flex-col items-center mb-8">
                <AuraOrb size="xl" showScore showState />
                <div className="flex flex-wrap justify-center gap-6 mt-8">
                    {dims.map((d, i) => (
                        <MetricRing key={i} label={d.label} value={d.value} color={d.color} size={80} />
                    ))}
                </div>
            </div>

            {/* Camera + metrics grid */}
            <div className="grid lg:grid-cols-5 gap-5 mb-5">
                {/* Camera — 3 cols */}
                <div className="lg:col-span-3">
                    <AuraCard glow="#8b5cf6" padding="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${sensor.isCameraActive ? "bg-red-500 animate-pulse" : "bg-gray-600"}`} />
                                <span className="text-xs text-gray-400 font-mono">
                                    {sensor.isCameraActive ? "CAMERA LIVE" : "CAMERA OFF"}
                                </span>
                                {sensor.isCameraActive && <span className="text-xs text-gray-600 font-mono">{fps} FPS</span>}
                                {sensor.isCameraActive && blinkDetectorRef.current?.isCalibrated() && (
                                    <span className="text-[10px] text-emerald-500 font-mono">✓ CALIBRATED</span>
                                )}
                            </div>
                            <button
                                onClick={sensor.isCameraActive ? stopCamera : startCamera}
                                className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${sensor.isCameraActive
                                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}
                            >
                                {sensor.isCameraActive ? "⏹ Stop" : "▶ Start Camera"}
                            </button>
                        </div>

                        <div className="relative bg-black/60 rounded-xl aspect-[4/3] overflow-hidden border border-white/5">
                            {/* Corner decorations */}
                            <div className="absolute inset-3 border border-indigo-500/15 rounded-lg pointer-events-none z-10">
                                {["tl","tr","bl","br"].map((pos) => (
                                    <div key={pos} className={`absolute w-5 h-5 ${pos.startsWith("t") ? "-top-px" : "-bottom-px"} ${pos.endsWith("l") ? "-left-px" : "-right-px"} border-${pos.startsWith("t") ? "t" : "b"}-2 border-${pos.endsWith("l") ? "l" : "r"}-2`} style={{ borderColor: "#8b5cf6" }} />
                                ))}
                            </div>
                            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} playsInline muted />
                            <canvas ref={canvasRef} width={640} height={480} className="absolute inset-0 w-full h-full z-20" style={{ transform: "scaleX(-1)" }} />

                            {FEATURES.screenDistanceAlert && (
                                <div className="absolute bottom-10 left-0 right-0 z-30 px-3">
                                    <ScreenDistanceAlert />
                                </div>
                            )}

                            {!sensor.isCameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                    <div className="text-5xl mb-4 opacity-20">📷</div>
                                    <p className="text-sm text-gray-500 mb-1">Camera not active</p>
                                    <p className="text-xs text-gray-600">Start camera to enable AI detection</p>
                                    {cameraError && <p className="text-xs text-red-400 mt-3 max-w-[280px] text-center">{cameraError}</p>}
                                </div>
                            )}

                            {/* Bottom info bar */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5 flex items-center justify-between z-20">
                                <span className="text-[10px] font-mono" style={{ color: "#a78bfa" }}>
                                    {landmarkCount > 0 ? `${landmarkCount} landmarks` : "No face detected"}
                                </span>
                                <span className="text-[10px] font-mono text-gray-600">
                                    EAR: {sensor.eyeAspectRatio.toFixed(3)} | Blinks: {sensor.blinkCount} | Yaw: {sensor.headYaw ?? 0}°
                                </span>
                            </div>
                        </div>
                    </AuraCard>
                </div>

                {/* Metrics — 2 cols */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <AuraCard padding="p-4">
                        <AuraCardHeader label="Session" icon="⏱️" />
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { l: "Duration",  v: `${sessionMins}m`,       c: "text-white" },
                                { l: "Focus",     v: `${wellness.focusScore}%`, c: "text-teal-400" },
                                { l: "Blinks",    v: sensor.blinkCount,        c: "text-cyan-400" },
                                { l: "WPM",       v: sensor.typingWPM,         c: "text-indigo-400" },
                                { l: "Clicks",    v: demoMode ? "n/a" : sensor.mouseClicks, c: "text-purple-400" },
                                { l: "Breaks",    v: movementBreaks,           c: "text-emerald-400" },
                                { l: "IKI Var",   v: `${sensor.ikiVariance ?? 0}%`, c: "text-amber-400" },
                                { l: "Overloads", v: sensor.overloadEvents,    c: "text-red-400" },
                            ].map((m, i) => (
                                <div key={i} className="bg-white/[0.025] rounded-xl p-2.5 text-center">
                                    <div className={`text-lg font-bold ${m.c}`}>{m.v}</div>
                                    <div className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wider">{m.l}</div>
                                </div>
                            ))}
                        </div>
                    </AuraCard>

                    <AuraCard padding="p-4" className="flex-1">
                        <AuraCardHeader label="Stress Timeline" icon="📈" />
                        <div className="h-32">
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
                    </AuraCard>

                    <AuraCard padding="p-4">
                        <AuraCardHeader label="Live Signals" icon="📡" />
                        <div className="space-y-1.5">
                            {[
                                { l: "Blink Rate",   v: `${sensor.blinkRate}/min`,                ok: sensor.blinkRate <= 25 && sensor.blinkRate >= 10 },
                                { l: "Eye Ratio",    v: sensor.eyeAspectRatio.toFixed(3),         ok: sensor.eyeAspectRatio >= 0.22 },
                                { l: "Mouse",        v: sensor.mouseActive ? "Active" : "Idle",   ok: sensor.mouseActive },
                                { l: "Cognitive",    v: sensor.cognitiveLabel,                    ok: sensor.cognitiveLoad < 70 },
                                { l: "Head Pose",    v: `${sensor.headYaw ?? 0}° / ${sensor.headPitch ?? 0}°`, ok: Math.abs(sensor.headYaw ?? 0) < 20 },
                                { l: "IKI Variance", v: `${sensor.ikiVariance ?? 0}%`,            ok: (sensor.ikiVariance ?? 0) < 50 },
                            ].map((m, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-white/[0.04] last:border-0">
                                    <span className="text-gray-500">{m.l}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-white font-medium">{m.v}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${m.ok ? "bg-emerald-400" : "bg-red-400"}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AuraCard>
                </div>
            </div>
        </div>
    );
}
