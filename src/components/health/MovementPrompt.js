"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSensor } from "@/context/SensorContext";
import { useHealth } from "@/context/HealthContext";
import { FEATURES } from "@/config/features";

/** Duration of each stretch phase in seconds */
const STRETCH_DURATION = 10;
const TOTAL_DURATION = 40; // 4 × 10s
const SUPPRESS_AFTER_MS = 30 * 60 * 1000; // 30 minutes
const INACTIVITY_THRESHOLD_MS = 8 * 60 * 1000; // 8 minutes
const SESSION_THRESHOLD_MS = 50 * 60 * 1000; // 50 minutes
const COGNITIVE_SUSTAINED_MS = 6 * 60 * 1000; // 6 minutes
const COGNITIVE_THRESHOLD = 70;
const SKIP_ENABLE_AFTER_S = 10;

const STRETCHES = [
    { name: "Neck Roll", instruction: "Slowly roll your neck left → right", icon: "🔄" },
    { name: "Shoulder Shrug", instruction: "Shrug shoulders up → hold → release", icon: "🙆" },
    { name: "Wrist Shake", instruction: "Shake your hands out loosely", icon: "🤲" },
    { name: "Eye Palming", instruction: "Cover eyes gently with warm palms", icon: "🌑" },
];

/** Persist a movement break timestamp to localStorage */
function saveBreak() {
    try {
        const raw = localStorage.getItem("mindguard_movement");
        const data = raw ? JSON.parse(raw) : [];
        data.push(Date.now());
        localStorage.setItem("mindguard_movement", JSON.stringify(data));
    } catch { /* ignore */ }
}

/**
 * MovementPrompt — mounts at root layout level.
 * Shows a full-width top banner with guided desk stretches when the user
 * has been inactive, fatigued, or in a long session.
 */
export default function MovementPrompt() {
    if (!FEATURES.movementPrompts) return null;
    return <MovementPromptInner />;
}

function MovementPromptInner() {
    const { mouseActive, cognitiveLoad, sessionStart } = useSensor();
    const { setMovementBreaks } = useHealth();

    const [visible, setVisible] = useState(false);
    const [stretchIndex, setStretchIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [canSkip, setCanSkip] = useState(false);

    /** @type {React.MutableRefObject<number|null>} */
    const suppressUntilRef = useRef(null);
    const countdownRef = useRef(null);
    const checkRef = useRef(null);
    const inactiveStartRef = useRef(null);
    const cognitiveHighStartRef = useRef(null);
    const sessionPromptedRef = useRef(false);

    const mouseActiveRef = useRef(mouseActive);
    const cognitiveLoadRef = useRef(cognitiveLoad);

    useEffect(() => { mouseActiveRef.current = mouseActive; }, [mouseActive]);
    useEffect(() => { cognitiveLoadRef.current = cognitiveLoad; }, [cognitiveLoad]);

    /**
     * Starts the 40-second guided stretch countdown.
     */
    const startStretch = useCallback(() => {
        setElapsed(0);
        setStretchIndex(0);
        setCanSkip(false);
        setVisible(true);

        if (countdownRef.current) clearInterval(countdownRef.current);

        countdownRef.current = setInterval(() => {
            setElapsed((prev) => {
                const next = prev + 1;
                setStretchIndex(Math.min(Math.floor(next / STRETCH_DURATION), STRETCHES.length - 1));
                if (next >= SKIP_ENABLE_AFTER_S) setCanSkip(true);
                if (next >= TOTAL_DURATION) {
                    clearInterval(countdownRef.current);
                    setMovementBreaks((b) => b + 1);
                    saveBreak();
                    suppressUntilRef.current = Date.now() + SUPPRESS_AFTER_MS;
                    setTimeout(() => setVisible(false), 2000);
                }
                return next;
            });
        }, 1000);
    }, [setMovementBreaks]);

    /**
     * Handles "Skip" button click.
     */
    const handleSkip = useCallback(() => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        suppressUntilRef.current = Date.now() + SUPPRESS_AFTER_MS;
        setVisible(false);
    }, []);

    // Trigger-check interval — runs every 30s
    useEffect(() => {
        checkRef.current = setInterval(() => {
            if (visible) return;
            if (suppressUntilRef.current && Date.now() < suppressUntilRef.current) return;

            const now = Date.now();

            // Track mouse inactivity
            if (!mouseActiveRef.current) {
                if (!inactiveStartRef.current) inactiveStartRef.current = now;
                if (now - inactiveStartRef.current >= INACTIVITY_THRESHOLD_MS) {
                    inactiveStartRef.current = null;
                    startStretch();
                    return;
                }
            } else {
                inactiveStartRef.current = null;
            }

            // Session length > 50min (prompt only once)
            if (!sessionPromptedRef.current && now - sessionStart >= SESSION_THRESHOLD_MS) {
                sessionPromptedRef.current = true;
                startStretch();
                return;
            }

            // Sustained cognitive load > 70 for 6+ minutes
            if (cognitiveLoadRef.current > COGNITIVE_THRESHOLD) {
                if (!cognitiveHighStartRef.current) cognitiveHighStartRef.current = now;
                if (now - cognitiveHighStartRef.current >= COGNITIVE_SUSTAINED_MS) {
                    cognitiveHighStartRef.current = null;
                    startStretch();
                    return;
                }
            } else {
                cognitiveHighStartRef.current = null;
            }
        }, 30000);

        return () => {
            if (checkRef.current) clearInterval(checkRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const progress = (elapsed / TOTAL_DURATION) * 100;
    const stretch = STRETCHES[stretchIndex];
    const isDone = elapsed >= TOTAL_DURATION;

    if (!visible) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9998]"
            style={{ animation: "banner-slide 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
            <div className="bg-[rgba(15,15,35,0.97)] backdrop-blur-xl border-b border-indigo-500/20 shadow-lg shadow-indigo-900/20 px-6 py-4">
                <div className="max-w-4xl mx-auto">
                    {isDone ? (
                        <div className="flex items-center justify-center gap-3 text-emerald-400 py-2">
                            <span className="text-2xl">🎉</span>
                            <span className="font-semibold">Great stretch! Back to focus.</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{stretch.icon}</span>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">
                                            Quick movement break — 2 minutes
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            <span className="text-indigo-400 font-semibold">{stretch.name}</span>
                                            {" — "}{stretch.instruction}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] text-gray-500 font-mono">
                                        {TOTAL_DURATION - elapsed}s left
                                    </span>
                                    {canSkip && (
                                        <button
                                            onClick={handleSkip}
                                            className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            Skip
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Stick figure SVG */}
                            <div className="flex justify-center mb-3">
                                <StickFigure stretchIndex={stretchIndex} />
                            </div>

                            {/* Phase dots */}
                            <div className="flex justify-center gap-2 mb-3">
                                {STRETCHES.map((s, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all ${
                                            i === stretchIndex
                                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                                : i < stretchIndex
                                                ? "text-emerald-500"
                                                : "text-gray-600"
                                        }`}
                                    >
                                        {i < stretchIndex ? "✓" : s.icon} {s.name}
                                    </div>
                                ))}
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{
                                        width: `${progress}%`,
                                        background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Animated SVG stick figure cycling through 4 desk stretches.
 * @param {{ stretchIndex: number }} props
 */
function StickFigure({ stretchIndex }) {
    const animations = [
        // Neck roll — head sways left/right
        "neck-roll",
        // Shoulder shrug — arms go up
        "shoulder-shrug",
        // Wrist shake — hands wave
        "wrist-shake",
        // Eye palming — hands over face
        "eye-palm",
    ];

    return (
        <svg
            width="80"
            height="100"
            viewBox="0 0 80 100"
            className={`stick-figure stick-${animations[stretchIndex]}`}
        >
            {/* Head */}
            <circle cx="40" cy="15" r="10" fill="none" stroke="#818cf8" strokeWidth="2.5" />
            {/* Body */}
            <line x1="40" y1="25" x2="40" y2="60" stroke="#818cf8" strokeWidth="2.5" />
            {/* Left leg */}
            <line x1="40" y1="60" x2="25" y2="85" stroke="#818cf8" strokeWidth="2.5" />
            {/* Right leg */}
            <line x1="40" y1="60" x2="55" y2="85" stroke="#818cf8" strokeWidth="2.5" />
            {/* Arms — position varies by stretch */}
            {stretchIndex === 0 && (
                // Neck roll: normal arms
                <>
                    <line x1="40" y1="35" x2="20" y2="50" stroke="#06b6d4" strokeWidth="2.5" />
                    <line x1="40" y1="35" x2="60" y2="50" stroke="#06b6d4" strokeWidth="2.5" />
                </>
            )}
            {stretchIndex === 1 && (
                // Shoulder shrug: arms raised
                <>
                    <line x1="40" y1="35" x2="18" y2="28" stroke="#06b6d4" strokeWidth="2.5" className="shrug-arm" />
                    <line x1="40" y1="35" x2="62" y2="28" stroke="#06b6d4" strokeWidth="2.5" className="shrug-arm" />
                </>
            )}
            {stretchIndex === 2 && (
                // Wrist shake: arms out to sides
                <>
                    <line x1="40" y1="35" x2="15" y2="42" stroke="#06b6d4" strokeWidth="2.5" />
                    <line x1="40" y1="35" x2="65" y2="42" stroke="#06b6d4" strokeWidth="2.5" />
                </>
            )}
            {stretchIndex === 3 && (
                // Eye palming: hands over face
                <>
                    <line x1="40" y1="35" x2="28" y2="20" stroke="#06b6d4" strokeWidth="2.5" />
                    <line x1="40" y1="35" x2="52" y2="20" stroke="#06b6d4" strokeWidth="2.5" />
                </>
            )}
        </svg>
    );
}
