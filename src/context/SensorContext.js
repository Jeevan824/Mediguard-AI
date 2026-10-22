"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";

const SensorContext = createContext(null);

export function SensorProvider({ children }) {
    // ── Camera state ─────────────────────────────────────────────────────────
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [faceLandmarks, setFaceLandmarks]   = useState(null);

    // ── Blink detection ───────────────────────────────────────────────────────
    const [eyeAspectRatio, setEyeAspectRatio] = useState(0.3);
    const [blinkRate, setBlinkRate]           = useState(0);
    const [blinkCount, setBlinkCount]         = useState(0);
    const [blinkConfidence, setBlinkConfidence] = useState(0);

    // ── Head pose ────────────────────────────────────────────────────────────
    const [headYaw, setHeadYaw]               = useState(0);
    const [headPitch, setHeadPitch]           = useState(0);
    const [headDistraction, setHeadDistraction] = useState(0);

    // ── Typing ───────────────────────────────────────────────────────────────
    const [typingWPM, setTypingWPM]           = useState(0);
    const [totalKeystrokes, setTotalKeystrokes] = useState(0);
    const [ikiVariance, setIkiVariance]       = useState(0);
    const [errorRate, setErrorRate]           = useState(0);

    // ── Mouse ─────────────────────────────────────────────────────────────────
    const [mouseSpeed, setMouseSpeed]         = useState(0);
    const [mouseDistance, setMouseDistance]   = useState(0);
    const [mouseClicks, setMouseClicks]       = useState(0);
    const [mouseActive, setMouseActive]       = useState(false);
    const [mouseIntensity, setMouseIntensity] = useState(0);
    const [jerkiness, setJerkiness]           = useState(0);
    const [idlePauses, setIdlePauses]         = useState(0);
    const [liveMouse, setLiveMouse]           = useState({
        status: "idle",
        reason: "Mouse tracker has not started yet.",
        speed: 0,
        clicks: 0,
        intensity: 0,
        isActive: false,
        idleMs: 0,
        jerkiness: 0,
        lastMoveAt: 0,
        lastClickAt: 0,
    });

    // ── Stress & cognitive load ───────────────────────────────────────────────
    const [stressLevel, setStressLevel]       = useState(0);
    const [cognitiveLoad, setCognitiveLoad]   = useState(0);
    const [cognitiveLabel, setCognitiveLabel] = useState("Low");
    const [cliBreakdown, setCliBreakdown]     = useState({});

    // ── Chart history — 60-point rolling arrays ───────────────────────────────
    const [blinkHistory, setBlinkHistory]     = useState([]);
    const [wpmHistory, setWpmHistory]         = useState([]);
    const [mouseHistory, setMouseHistory]     = useState([]);
    const [stressHistory, setStressHistory]   = useState([]);
    const [loadHistory, setLoadHistory]       = useState([]);
    const [earHistory, setEarHistory]         = useState([]);
    const [focusHistory, setFocusHistory]     = useState([]);
    const [timeLabels, setTimeLabels]         = useState([]);

    // ── Session log: timestamped snapshots for export ─────────────────────────
    const sessionLogRef = useRef([]);
    const [sessionStart] = useState(() => Date.now());
    const [overloadEvents, setOverloadEvents] = useState(0);

    // ── Push chart data (keeps last 60 points) ────────────────────────────────
    const pushChartData = useCallback((blink, wpm, mouseSpd, stress, load, ear, focus) => {
        const label = new Date().toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
        setBlinkHistory((p)  => [...p.slice(-59), blink]);
        setWpmHistory((p)    => [...p.slice(-59), wpm]);
        setMouseHistory((p)  => [...p.slice(-59), mouseSpd]);
        setStressHistory((p) => [...p.slice(-59), stress]);
        setLoadHistory((p)   => [...p.slice(-59), load]);
        setEarHistory((p)    => [...p.slice(-59), Math.round(ear * 1000) / 10]); // as 0-50 scale
        setFocusHistory((p)  => [...p.slice(-59), focus]);
        setTimeLabels((p)    => [...p.slice(-59), label]);
    }, []);

    // ── Session snapshot (called every 5s from dashboard) ────────────────────
    const pushSessionSnapshot = useCallback((snapshot) => {
        sessionLogRef.current.push(snapshot);
        // cap at 720 entries (1 hour of 5s samples)
        if (sessionLogRef.current.length > 720) sessionLogRef.current.shift();
    }, []);

    // ── Export session data as CSV download ───────────────────────────────────
    const exportSessionCSV = useCallback(() => {
        const log = sessionLogRef.current;
        if (!log.length) return;
        const headers = Object.keys(log[0]).join(",");
        const rows    = log.map(r => Object.values(r).join(",")).join("\n");
        const blob    = new Blob([headers + "\n" + rows], { type: "text/csv" });
        const url     = URL.createObjectURL(blob);
        const a       = document.createElement("a");
        a.href        = url;
        a.download    = `mindguard_session_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    // ── Export session data as JSON download ──────────────────────────────────
    const exportSessionJSON = useCallback(() => {
        const log  = sessionLogRef.current;
        if (!log.length) return;
        const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `mindguard_session_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const getSessionLog = useCallback(() => sessionLogRef.current, []);

    const value = {
        // Camera
        isCameraActive, setIsCameraActive,
        faceLandmarks,  setFaceLandmarks,
        // Blink
        eyeAspectRatio, setEyeAspectRatio,
        blinkRate,      setBlinkRate,
        blinkCount,     setBlinkCount,
        blinkConfidence, setBlinkConfidence,
        // Head pose
        headYaw,         setHeadYaw,
        headPitch,       setHeadPitch,
        headDistraction, setHeadDistraction,
        // Typing
        typingWPM,       setTypingWPM,
        totalKeystrokes, setTotalKeystrokes,
        ikiVariance,     setIkiVariance,
        errorRate,       setErrorRate,
        // Mouse
        mouseSpeed,      setMouseSpeed,
        mouseDistance,   setMouseDistance,
        mouseClicks,     setMouseClicks,
        mouseActive,     setMouseActive,
        mouseIntensity,  setMouseIntensity,
        jerkiness,       setJerkiness,
        idlePauses,      setIdlePauses,
        liveMouse,       setLiveMouse,
        // Cognitive
        stressLevel,     setStressLevel,
        cognitiveLoad,   setCognitiveLoad,
        cognitiveLabel,  setCognitiveLabel,
        cliBreakdown,    setCliBreakdown,
        // History (60-point)
        blinkHistory, wpmHistory, mouseHistory, stressHistory,
        loadHistory, earHistory, focusHistory, timeLabels,
        pushChartData,
        // Session
        sessionStart,
        overloadEvents, setOverloadEvents,
        pushSessionSnapshot,
        exportSessionCSV,
        exportSessionJSON,
        getSessionLog,
    };

    return (
        <SensorContext.Provider value={value}>
            {children}
        </SensorContext.Provider>
    );
}

export function useSensor() {
    const ctx = useContext(SensorContext);
    if (!ctx) throw new Error("useSensor must be used within SensorProvider");
    return ctx;
}
