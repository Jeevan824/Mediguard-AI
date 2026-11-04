"use client";
import { useAura } from "@/context/AuraContext";
import { useState, useEffect, useRef, useCallback } from "react";
import AuraOrb from "@/components/aura/AuraOrb";
import { scoreToColor } from "@/config/auraTheme";

export default function FocusPage() { return <FocusContent />; }

const POMODORO_WORK  = 25 * 60;
const POMODORO_BREAK =  5 * 60;

const T = {
    bg: "#0d1117", surface: "#161b22", border: "#21262d", border2: "#30363d",
    text: "#e6edf3", textMid: "#8b949e", textDim: "#484f58",
    amber: "#e6a817", ok: "#3fb950", warn: "#d29922", crit: "#da3633", blue: "#388bfd",
    mono: "'JetBrains Mono','Courier New',monospace",
    sans: "'Inter',system-ui,sans-serif",
};

function Card({ children, style = {} }) {
    return (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", ...style }}>
            {children}
        </div>
    );
}
function CardHeader({ label, right }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: "#0d1117" }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.amber }}>{label}</span>
            {right}
        </div>
    );
}

function FocusContent() {
    const { wellness, stateColor, logEvent } = useAura();
    const [mode, setMode] = useState("idle");
    const [timeLeft, setTimeLeft] = useState(POMODORO_WORK);
    const [cycle, setCycle] = useState(1);
    const [sessions, setSessions] = useState([]);
    const [currentTask, setCurrentTask] = useState("");
    const timerRef      = useRef(null);
    const startTimeRef  = useRef(null);
    const startStressRef = useRef(0);

    const start = useCallback((m = "work") => {
        if (timerRef.current) clearInterval(timerRef.current);
        setMode(m);
        const duration = m === "work" ? POMODORO_WORK : POMODORO_BREAK;
        setTimeLeft(duration);
        startTimeRef.current  = Date.now();
        startStressRef.current = wellness.stressScore;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    if (m === "work") {
                        logEvent("focus", `Pomodoro #${cycle} complete. Task: ${currentTask || "No task set"}`);
                        setSessions((s) => [...s, {
                            cycle, startStress: startStressRef.current,
                            endStress: wellness.stressScore,
                            task: currentTask, duration: 25,
                        }]);
                        setCycle((c) => c + 1);
                        setMode("break_ready");
                    } else {
                        setMode("idle");
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [cycle, currentTask, wellness.stressScore, logEvent]);

    const stop = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setMode("idle");
        setTimeLeft(POMODORO_WORK);
    }, []);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    const mins     = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const secs     = (timeLeft % 60).toString().padStart(2, "0");
    const progress = mode === "work"
        ? ((POMODORO_WORK - timeLeft) / POMODORO_WORK) * 100
        : mode === "break"
        ? ((POMODORO_BREAK - timeLeft) / POMODORO_BREAK) * 100 : 0;

    const timerColor = mode === "work" ? T.amber : mode.includes("break") ? T.ok : T.border2;
    const r = 85;
    const circumference = 2 * Math.PI * r;

    const focusQuality = wellness.focusScore;
    const qualityColor = focusQuality >= 70 ? T.ok : focusQuality >= 50 ? T.warn : T.crit;
    const qualityLabel = focusQuality >= 70 ? "EXCELLENT" : focusQuality >= 50 ? "GOOD" : "DISTRACTED";

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
                    <h1 style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 900, color: T.text, letterSpacing: "-0.02em" }}>
                        Focus <span style={{ color: T.amber }}>Session</span>
                    </h1>
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        / pomodoro
                    </span>
                </div>
                <p style={{ color: T.textMid, fontSize: 13 }}>
                    AI-monitored work intervals with real-time focus quality tracking
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>

                {/* ── Timer panel ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Card>
                        <CardHeader
                            label={mode === "work" ? `Pomodoro #${cycle}` : mode === "break" ? "Short Break" : mode === "break_ready" ? "Session Complete" : "Ready"}
                            right={
                                <span style={{
                                    fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                                    color: mode === "idle" ? T.textDim : timerColor,
                                    padding: "2px 6px", borderRadius: 3,
                                    background: (mode === "idle" ? T.textDim : timerColor) + "18",
                                    border: `1px solid ${(mode === "idle" ? T.textDim : timerColor)}35`,
                                }}>
                                    {mode === "idle" ? "STANDBY" : mode === "break_ready" ? "✓ DONE" : "RUNNING"}
                                </span>
                            }
                        />
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px" }}>
                            {/* Circular timer */}
                            <div style={{ position: "relative", marginBottom: 24 }}>
                                <svg width={200} height={200} viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
                                    <circle cx={100} cy={100} r={r} fill="none" stroke={T.border} strokeWidth={6} />
                                    <circle cx={100} cy={100} r={r} fill="none"
                                        stroke={timerColor}
                                        strokeWidth={6} strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={circumference * (1 - progress / 100)}
                                        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
                                    />
                                </svg>
                                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                    <div style={{ fontFamily: T.mono, fontSize: 42, fontWeight: 900, color: T.text, letterSpacing: "-0.04em", lineHeight: 1 }}>
                                        {mins}:{secs}
                                    </div>
                                    <div style={{ fontFamily: T.mono, fontSize: 10, color: timerColor, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                        {mode === "work" ? "focus time" : mode === "break" ? "rest time" : mode === "break_ready" ? "complete!" : "standby"}
                                    </div>
                                </div>
                            </div>

                            {/* Task input */}
                            {mode === "idle" && (
                                <input
                                    value={currentTask}
                                    onChange={(e) => setCurrentTask(e.target.value)}
                                    placeholder="What are you working on?"
                                    style={{
                                        width:       "100%",
                                        marginBottom: 14,
                                        background:  T.bg,
                                        border:      `1px solid ${T.border2}`,
                                        borderRadius: 4,
                                        padding:     "8px 12px",
                                        fontSize:    12,
                                        color:       T.text,
                                        fontFamily:  T.mono,
                                        outline:     "none",
                                        textAlign:   "center",
                                        boxSizing:   "border-box",
                                    }}
                                />
                            )}

                            {/* Controls */}
                            <div style={{ display: "flex", gap: 8, width: "100%" }}>
                                {mode === "idle" && (
                                    <button onClick={() => start("work")} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                                        ▶ Start Focus
                                    </button>
                                )}
                                {mode === "work" && (
                                    <button onClick={stop} style={{
                                        flex: 1, padding: "9px 16px", borderRadius: 5, fontWeight: 700, fontSize: 12,
                                        background: "rgba(218,54,51,0.08)", color: T.crit,
                                        border: `1px solid rgba(218,54,51,0.25)`, cursor: "pointer",
                                    }}>
                                        ⏹ Stop
                                    </button>
                                )}
                                {mode === "break_ready" && (
                                    <>
                                        <button onClick={() => start("break")} className="btn-aurora" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
                                            Take Break →
                                        </button>
                                        <button onClick={() => start("work")} className="btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
                                            Skip
                                        </button>
                                    </>
                                )}
                                {mode === "break" && (
                                    <button onClick={stop} className="btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
                                        End Break
                                    </button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Focus quality */}
                    <Card>
                        <CardHeader label="Live Focus Quality" />
                        <div style={{ padding: "16px 14px" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                                <span style={{ fontFamily: T.mono, fontSize: 36, fontWeight: 900, color: qualityColor, lineHeight: 1 }}>
                                    {focusQuality}
                                </span>
                                <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textMid }}>/100</span>
                                <span style={{
                                    fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                                    padding: "2px 7px", borderRadius: 3,
                                    background: qualityColor + "18", color: qualityColor,
                                    border: `1px solid ${qualityColor}35`,
                                }}>{qualityLabel}</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: T.border, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", width: `${focusQuality}%`,
                                    background: `linear-gradient(90deg, ${qualityColor}88, ${qualityColor})`,
                                    borderRadius: 2, transition: "width 0.8s ease",
                                }} />
                            </div>
                        </div>
                        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                            {[
                                { l: "Stress",   v: `${wellness.stressScore}%`,  c: scoreToColor(100 - wellness.stressScore) },
                                { l: "Fatigue",  v: `${wellness.fatigueScore}%`, c: scoreToColor(100 - wellness.fatigueScore) },
                                { l: "Energy",   v: `${wellness.energyLevel}%`,  c: scoreToColor(wellness.energyLevel) },
                            ].map((m, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                                    <span style={{ color: T.textMid }}>{m.l}</span>
                                    <span style={{ fontFamily: T.mono, fontWeight: 700, color: m.c }}>{m.v}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* ── Right panel: Aura orb + session log ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Card>
                        <CardHeader label="Cognitive State" />
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px" }}>
                            <AuraOrb size="lg" showScore showState />
                        </div>
                    </Card>

                    {/* Session history */}
                    <Card style={{ flex: 1 }}>
                        <CardHeader
                            label="Session Log"
                            right={<span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim }}>{sessions.length} sessions</span>}
                        />
                        {sessions.length === 0 ? (
                            <div style={{ padding: "40px 16px", textAlign: "center", color: T.textDim, fontSize: 12, fontFamily: T.mono }}>
                                — complete a pomodoro to populate log —
                            </div>
                        ) : (
                            <div>
                                {/* Table header */}
                                <div style={{
                                    display: "grid", gridTemplateColumns: "40px 1fr 80px 80px 80px",
                                    padding: "6px 14px", borderBottom: `1px solid ${T.border}`,
                                }}>
                                    {["#", "Task", "Duration", "Start σ", "End σ"].map((h, i) => (
                                        <div key={i} style={{ fontFamily: T.mono, fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</div>
                                    ))}
                                </div>
                                {sessions.map((s, i) => (
                                    <div key={i} style={{
                                        display: "grid", gridTemplateColumns: "40px 1fr 80px 80px 80px",
                                        padding: "8px 14px", borderBottom: `1px solid ${T.border}`,
                                        background: i % 2 === 0 ? "transparent" : "#0d1117",
                                        fontSize: 11,
                                    }}>
                                        <span style={{ fontFamily: T.mono, color: T.amber, fontWeight: 700 }}>#{s.cycle}</span>
                                        <span style={{ color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.task || "—"}</span>
                                        <span style={{ fontFamily: T.mono, color: T.text }}>{s.duration}m</span>
                                        <span style={{ fontFamily: T.mono, color: scoreToColor(100 - s.startStress) }}>{s.startStress}%</span>
                                        <span style={{ fontFamily: T.mono, color: scoreToColor(100 - s.endStress) }}>{s.endStress}%</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
