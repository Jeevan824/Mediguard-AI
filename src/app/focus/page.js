"use client";
import { useAura } from "@/context/AuraContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuraCard, { AuraCardHeader } from "@/components/aura/AuraCard";
import AuraOrb from "@/components/aura/AuraOrb";
import { scoreToColor } from "@/config/auraTheme";

export default function FocusPage() {
    return <FocusContent />;
}

const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;

function FocusContent() {
    const { wellness, stateColor, logEvent } = useAura();

    const [mode, setMode] = useState("idle"); // idle | work | break
    const [timeLeft, setTimeLeft] = useState(POMODORO_WORK);
    const [cycle, setCycle] = useState(1);
    const [sessions, setSessions] = useState([]);
    const [currentTask, setCurrentTask] = useState("");
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const startStressRef = useRef(0);

    const start = useCallback((m = "work") => {
        if (timerRef.current) clearInterval(timerRef.current);
        setMode(m);
        const duration = m === "work" ? POMODORO_WORK : POMODORO_BREAK;
        setTimeLeft(duration);
        startTimeRef.current = Date.now();
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

    const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const secs = (timeLeft % 60).toString().padStart(2, "0");
    const progress = mode === "work"
        ? ((POMODORO_WORK - timeLeft) / POMODORO_WORK) * 100
        : mode === "break"
        ? ((POMODORO_BREAK - timeLeft) / POMODORO_BREAK) * 100 : 0;

    const focusQuality = wellness.focusScore;
    const qualityLabel = focusQuality >= 70 ? "Excellent Focus" : focusQuality >= 50 ? "Good Focus" : "Distracted";

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    <span className="aura-gradient-text">Focus Session</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">AI-monitored Pomodoro sessions with real-time focus quality</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
                {/* Timer */}
                <AuraCard glow={stateColor} className="lg:col-span-1 flex flex-col items-center py-8">
                    <div className="mb-6 text-center">
                        <div className={`text-xs font-semibold uppercase tracking-widest mb-1 ${mode === "work" ? "text-indigo-400" : mode.includes("break") ? "text-teal-400" : "text-gray-500"}`}>
                            {mode === "work" ? `Pomodoro #${cycle}` : mode === "break" ? "Short Break" : mode === "break_ready" ? "🎉 Session Complete!" : "Ready"}
                        </div>
                    </div>

                    {/* Circular timer */}
                    <div className="relative mb-6">
                        <svg width={200} height={200} viewBox="0 0 200 200" className="-rotate-90">
                            <circle cx={100} cy={100} r={85} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={8} />
                            <circle cx={100} cy={100} r={85} fill="none"
                                stroke={mode === "work" ? "#8b5cf6" : "#2dd4bf"}
                                strokeWidth={8} strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 85}
                                strokeDashoffset={2 * Math.PI * 85 * (1 - progress / 100)}
                                style={{ transition: "stroke-dashoffset 1s linear" }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="text-5xl font-bold text-white font-mono">{mins}:{secs}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {mode === "work" ? "Focus time" : mode === "break" ? "Rest time" : "—"}
                            </div>
                        </div>
                    </div>

                    {/* Task input */}
                    {mode === "idle" && (
                        <input
                            value={currentTask}
                            onChange={(e) => setCurrentTask(e.target.value)}
                            placeholder="What are you working on?"
                            className="w-full mb-4 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none text-center"
                        />
                    )}

                    {/* Controls */}
                    <div className="flex gap-2 w-full">
                        {mode === "idle" && (
                            <button onClick={() => start("work")} className="flex-1 btn-primary text-xs py-2.5">
                                ▶ Start Focus
                            </button>
                        )}
                        {mode === "work" && (
                            <button onClick={stop} className="flex-1 text-xs py-2.5 rounded-xl font-semibold"
                                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                                ⏹ Stop
                            </button>
                        )}
                        {mode === "break_ready" && (
                            <>
                                <button onClick={() => start("break")} className="flex-1 btn-aurora text-xs py-2.5">
                                    Take Break →
                                </button>
                                <button onClick={() => start("work")} className="flex-1 btn-secondary text-xs py-2.5">
                                    Skip Break
                                </button>
                            </>
                        )}
                        {mode === "break" && (
                            <button onClick={stop} className="flex-1 btn-secondary text-xs py-2.5">
                                End Break
                            </button>
                        )}
                    </div>
                </AuraCard>

                {/* Focus quality */}
                <AuraCard className="lg:col-span-1">
                    <AuraCardHeader label="Live Focus Quality" icon="🎯" />
                    <div className="flex flex-col items-center py-4">
                        <AuraOrb size="md" showScore showState />
                        <div className="mt-6 w-full space-y-2">
                            {[
                                { l: "Focus Score", v: wellness.focusScore, c: scoreToColor(wellness.focusScore) },
                                { l: "Cognitive Load", v: wellness.cognitiveLoad, c: scoreToColor(100 - wellness.cognitiveLoad) },
                                { l: "Stress", v: wellness.stressScore, c: scoreToColor(100 - wellness.stressScore) },
                                { l: "Energy", v: wellness.energyLevel, c: scoreToColor(wellness.energyLevel) },
                            ].map((m, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[11px] mb-0.5">
                                        <span className="text-gray-500">{m.l}</span>
                                        <span style={{ color: m.c }}>{m.v}/100</span>
                                    </div>
                                    <div className="stress-meter">
                                        <div className="stress-meter-fill" style={{ width: `${m.v}%`, background: m.c }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AuraCard>

                {/* Session history */}
                <AuraCard className="lg:col-span-1">
                    <AuraCardHeader label={`Session History (${sessions.length} today)`} icon="📋" />
                    {sessions.length === 0 ? (
                        <p className="text-xs text-gray-600 text-center py-8">Complete a Pomodoro to see your session history.</p>
                    ) : (
                        <div className="space-y-2">
                            {sessions.slice(-8).reverse().map((s, i) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0">
                                    <div>
                                        <span className="text-gray-400">#{s.cycle}</span>
                                        {s.task && <span className="text-gray-500 ml-2 italic">&quot;{s.task.slice(0, 20)}&quot;</span>}
                                    </div>
                                    <div className="text-right">
                                        <span className={s.endStress < s.startStress ? "text-emerald-400" : "text-amber-400"}>
                                            {s.endStress < s.startStress ? "↓" : "↑"} stress
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </AuraCard>
            </div>
        </div>
    );
}

