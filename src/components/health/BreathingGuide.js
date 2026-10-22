"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSensor } from "@/context/SensorContext";
import { useHealth } from "@/context/HealthContext";
import { FEATURES } from "@/config/features";

const CYCLES_DEFAULT = 3;
const INHALE_S = 4;
const HOLD_S = 7;
const EXHALE_S = 8;
const CYCLE_S = INHALE_S + HOLD_S + EXHALE_S; // 19 seconds
const AUTO_TRIGGER_THROTTLE_MS = 25 * 60 * 1000; // 25 minutes
const STRESS_HIGH = 75;
const STRESS_SUSTAINED_ABOVE = 60;
const STRESS_SUSTAINED_MS = 2 * 60 * 1000; // 2 minutes
const CIRCLE_MIN = 40;
const CIRCLE_MAX = 120;

/**
 * Returns the current breathing phase and second-within-phase for a given elapsed time.
 * @param {number} elapsedInCycle - seconds elapsed within current cycle (0-18)
 * @returns {{ phase: 'inhale'|'hold'|'exhale', phaseSecond: number }}
 */
function getPhase(elapsedInCycle) {
    if (elapsedInCycle < INHALE_S) return { phase: "inhale", phaseSecond: elapsedInCycle };
    if (elapsedInCycle < INHALE_S + HOLD_S) return { phase: "hold", phaseSecond: elapsedInCycle - INHALE_S };
    return { phase: "exhale", phaseSecond: elapsedInCycle - INHALE_S - HOLD_S };
}

/** Saves a breathing session to localStorage */
function saveSession(stressAtStart, cyclesCompleted) {
    try {
        const raw = localStorage.getItem("mindguard_breathing");
        const data = raw ? JSON.parse(raw) : [];
        data.push({ timestamp: Date.now(), stressAtStart, cyclesCompleted });
        localStorage.setItem("mindguard_breathing", JSON.stringify(data));
    } catch { /* ignore */ }
}

/**
 * BreathingGuide " mounts at root layout level.
 * Renders an inline card (not a modal) for guided 4-7-8 breathing.
 * Auto-triggers when stress spikes; also opened manually via HealthContext.
 */
export default function BreathingGuide() {
    if (!FEATURES.breathingGuide) return null;
    return <BreathingGuideInner />;
}

function BreathingGuideInner() {
    const { stressLevel, setOverloadEvents } = useSensor();
    const { breathingOpen, setBreathingOpen, breathingManualRef } = useHealth();

    const [totalElapsed, setTotalElapsed] = useState(0);
    const [canEndEarly, setCanEndEarly] = useState(false);
    const [completionMsg, setCompletionMsg] = useState(null);

    /** @type {React.MutableRefObject<number|null>} */
    const lastAutoTriggerRef = useRef(null);
    const stressHighSinceRef = useRef(null);
    const stressRef = useRef(stressLevel);
    const tickRef = useRef(null);
    const checkRef = useRef(null);
    const stressAtStartRef = useRef(0);

    useEffect(() => { stressRef.current = stressLevel; }, [stressLevel]);

    /** Starts the breathing exercise timer */
    const startExercise = useCallback(() => {
        setTotalElapsed(0);
        setCanEndEarly(false);
        setCompletionMsg(null);
        stressAtStartRef.current = stressRef.current;

        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = setInterval(() => {
            setTotalElapsed((prev) => {
                const next = prev + 1;
                const cycle = Math.floor(next / CYCLE_S) + 1;
                if (cycle > 1) setCanEndEarly(true);
                if (next >= CYCLE_S * CYCLES_DEFAULT) {
                    clearInterval(tickRef.current);
                    const cyclesDone = CYCLES_DEFAULT;
                    saveSession(stressAtStartRef.current, cyclesDone);
                    setOverloadEvents((e) => e + 1);
                    setCompletionMsg(
                        `Great " your stress score was ${stressAtStartRef.current}. Let's see if that helped.`
                    );
                    setTimeout(() => {
                        setBreathingOpen(false);
                        setCompletionMsg(null);
                    }, 4000);
                }
                return next;
            });
        }, 1000);
    }, [setBreathingOpen, setOverloadEvents]);

    // Start timer when opened
    useEffect(() => {
        if (breathingOpen) {
            const t = setTimeout(() => startExercise(), 0);
            return () => {
                clearTimeout(t);
                if (tickRef.current) clearInterval(tickRef.current);
            };
        } else {
            if (tickRef.current) clearInterval(tickRef.current);
        }
    }, [breathingOpen, startExercise]);

    // Auto-trigger check every 5 seconds
    useEffect(() => {
        checkRef.current = setInterval(() => {
            if (breathingOpen) return;
            const now = Date.now();
            const s = stressRef.current;

            // Check throttle
            if (lastAutoTriggerRef.current && now - lastAutoTriggerRef.current < AUTO_TRIGGER_THROTTLE_MS) return;

            if (s >= STRESS_SUSTAINED_ABOVE) {
                if (!stressHighSinceRef.current) stressHighSinceRef.current = now;
                if (s > STRESS_HIGH && now - stressHighSinceRef.current >= STRESS_SUSTAINED_MS) {
                    stressHighSinceRef.current = null;
                    lastAutoTriggerRef.current = now;
                    breathingManualRef.current = false;
                    setBreathingOpen(true);
                }
            } else {
                stressHighSinceRef.current = null;
            }
        }, 5000);

        return () => { if (checkRef.current) clearInterval(checkRef.current); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /** End exercise early */
    const handleEndEarly = useCallback(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        const cyclesDone = Math.floor(totalElapsed / CYCLE_S);
        saveSession(stressAtStartRef.current, cyclesDone);
        setOverloadEvents((e) => e + 1);
        setBreathingOpen(false);
    }, [totalElapsed, setBreathingOpen, setOverloadEvents]);

    if (!breathingOpen) return null;

    const cycleElapsed = totalElapsed % CYCLE_S;
    const currentCycle = Math.floor(totalElapsed / CYCLE_S) + 1;
    const { phase, phaseSecond } = getPhase(cycleElapsed);

    // Compute circle radius
    let radius = CIRCLE_MIN;
    if (phase === "inhale") {
        radius = CIRCLE_MIN + ((CIRCLE_MAX - CIRCLE_MIN) * phaseSecond) / INHALE_S;
    } else if (phase === "hold") {
        radius = CIRCLE_MAX;
    } else {
        radius = CIRCLE_MAX - ((CIRCLE_MAX - CIRCLE_MIN) * phaseSecond) / EXHALE_S;
    }

    const phaseLabel = phase === "inhale" ? "Inhale..." : phase === "hold" ? "Hold..." : "Exhale...";
    const phaseColor =
        phase === "inhale" ? "text-teal-400 border-teal-500/40" :
        phase === "hold" ? "text-purple-400 border-purple-500/40" :
        "text-blue-400 border-blue-500/40";
    const circleFill =
        phase === "inhale" ? "rgba(20,184,166,0.12)" :
        phase === "hold" ? "rgba(168,85,247,0.12)" :
        "rgba(59,130,246,0.12)";
    const circleStroke =
        phase === "inhale" ? "#14b8a6" :
        phase === "hold" ? "#a855f7" :
        "#3b82f6";

    return (
        <div className="fixed inset-x-0 top-20 z-[9990] flex justify-center px-4 pointer-events-none">
            <div
                className="w-full max-w-sm glass-card p-6 border border-indigo-500/20 pointer-events-auto shadow-2xl shadow-indigo-900/30"
                style={{ animation: "toast-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
                {completionMsg ? (
                    <div className="text-center py-4">
                        <div className="text-3xl mb-3"></div>
                        <p className="text-sm text-emerald-400 font-semibold">{completionMsg}</p>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-4">
                            <h3 className="text-sm font-bold text-white mb-0.5">Guided Breathing</h3>
                            <p className="text-[11px] text-gray-500">4-7-8 Method  -  Cycle {currentCycle} of {CYCLES_DEFAULT}</p>
                        </div>

                        {/* Animated Circle */}
                        <div className="flex justify-center mb-4">
                            <svg width="260" height="260" viewBox="0 0 260 260">
                                {/* Outer glow ring */}
                                <circle
                                    cx="130" cy="130"
                                    r={radius + 16}
                                    fill="none"
                                    stroke={circleStroke}
                                    strokeWidth="1"
                                    opacity="0.2"
                                />
                                {/* Main breathing circle */}
                                <circle
                                    cx="130" cy="130"
                                    r={radius}
                                    fill={circleFill}
                                    stroke={circleStroke}
                                    strokeWidth="2.5"
                                    style={{ transition: "r 1s linear, fill 1s ease, stroke 1s ease" }}
                                />
                                {/* Phase label in center */}
                                <text
                                    x="130" y="124"
                                    textAnchor="middle"
                                    fill={circleStroke}
                                    fontSize="15"
                                    fontWeight="600"
                                    fontFamily="Inter, sans-serif"
                                >
                                    {phaseLabel}
                                </text>
                                <text
                                    x="130" y="144"
                                    textAnchor="middle"
                                    fill="#6b7280"
                                    fontSize="11"
                                    fontFamily="Inter, sans-serif"
                                >
                                    {phase === "inhale" ? `${INHALE_S - phaseSecond}s` :
                                     phase === "hold" ? `${HOLD_S - phaseSecond}s` :
                                     `${EXHALE_S - phaseSecond}s`}
                                </text>
                            </svg>
                        </div>

                        {/* Phase indicator */}
                        <div className="flex justify-center gap-2 mb-4">
                            {["inhale", "hold", "exhale"].map((p) => (
                                <span
                                    key={p}
                                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                        phase === p ? phaseColor + " font-semibold" : "text-gray-600 border-gray-700"
                                    }`}
                                >
                                    {p === "inhale" ? `Inhale ${INHALE_S}s` : p === "hold" ? `Hold ${HOLD_S}s` : `Exhale ${EXHALE_S}s`}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {canEndEarly && (
                                <button
                                    onClick={handleEndEarly}
                                    className="flex-1 text-xs py-2 rounded-lg text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
                                >
                                    End early
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

