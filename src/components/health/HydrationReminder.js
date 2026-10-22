"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSensor } from "@/context/SensorContext";
import { useHealth } from "@/context/HealthContext";
import { FEATURES } from "@/config/features";

/**
 * Returns today's date as YYYY-MM-DD string.
 * @returns {string}
 */
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Loads the persisted hydration count for today from localStorage.
 * @returns {number}
 */
function loadTodayCount() {
    if (typeof window === "undefined") return 0;
    try {
        const raw = localStorage.getItem("mindguard_hydration");
        const data = raw ? JSON.parse(raw) : {};
        return data[todayKey()] ?? 0;
    } catch {
        return 0;
    }
}

/**
 * Persists the hydration count for today to localStorage.
 * @param {number} count
 */
function saveTodayCount(count) {
    try {
        const raw = localStorage.getItem("mindguard_hydration");
        const data = raw ? JSON.parse(raw) : {};
        data[todayKey()] = count;
        localStorage.setItem("mindguard_hydration", JSON.stringify(data));
    } catch {
        // ignore storage errors
    }
}

/**
 * HydrationReminder " mounts at root layout level.
 * Shows a bottom-left toast reminding the user to drink water.
 * Interval adapts to stress level: 45min base  30min (stress>65)  20min (stress>80).
 * Persists daily count in localStorage under key "mindguard_hydration".
 */
export default function HydrationReminder() {
    if (!FEATURES.hydrationReminders) return null;

    return <HydrationReminderInner />;
}

function HydrationReminderInner() {
    const { stressLevel } = useSensor();
    const { setTodayHydrationCount } = useHealth();

    /** @type {React.MutableRefObject<ReturnType<typeof setInterval>|null>} */
    const intervalRef = useRef(null);
    /** @type {React.MutableRefObject<ReturnType<typeof setTimeout>|null>} */
    const dismissRef = useRef(null);

    const [visible, setVisible] = useState(false);
    const [hydrationLog, setHydrationLog] = useState([]);
    const [todayCount, setTodayCount] = useState(0);
    const [minutesFocused, setMinutesFocused] = useState(0);
    const [confirmed, setConfirmed] = useState(false);
    const [nextReminderIn, setNextReminderIn] = useState(45);

    // Ref-based copy of stressLevel so interval callback reads latest value
    const stressRef = useRef(stressLevel);
    useEffect(() => { stressRef.current = stressLevel; }, [stressLevel]);

    // Load persisted count on mount
    useEffect(() => {
        sessionStart.current = Date.now();
        const count = loadTodayCount();
        const t = setTimeout(() => { setTodayCount(count); setTodayHydrationCount(count); }, 0);
        return () => clearTimeout(t);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Returns the reminder interval in minutes based on current stress level.
     * @returns {number}
     */
    const getInterval = useCallback(() => {
        const s = stressRef.current;
        if (s > 80) return 20;
        if (s > 65) return 30;
        return 45;
    }, []);

    /** @type {React.MutableRefObject<number>} */
    const sessionStart = useRef(0);

    /**
     * Schedules (or reschedules) the next reminder interval.
     * Clears any existing interval first.
     */
    const scheduleNext = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const mins = getInterval();
        setNextReminderIn(mins);

        intervalRef.current = setInterval(() => {
            const elapsed = Math.round((Date.now() - sessionStart.current) / 60000);
            setMinutesFocused(elapsed);
            setConfirmed(false);
            setVisible(true);

            // Auto-dismiss after 6 seconds if user ignores
            if (dismissRef.current) clearTimeout(dismissRef.current);
            dismissRef.current = setTimeout(() => setVisible(false), 6000);
        }, mins * 60 * 1000);
    }, [getInterval]);

    // Start schedule on mount; clean up on unmount
    useEffect(() => {
        const t = setTimeout(() => scheduleNext(), 0);
        return () => {
            clearTimeout(t);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (dismissRef.current) clearTimeout(dismissRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Handles the "Drank water" button click.
     * Logs timestamp, increments count, persists, resets the interval timer.
     */
    const handleDrank = useCallback(() => {
        const now = Date.now();
        setHydrationLog((prev) => [...prev, now]);
        setTodayCount((prev) => {
            const next = prev + 1;
            saveTodayCount(next);
            setTodayHydrationCount(next);
            return next;
        });
        setConfirmed(true);
        if (dismissRef.current) clearTimeout(dismissRef.current);
        // Auto hide confirmation after 3s then restart interval
        dismissRef.current = setTimeout(() => {
            setVisible(false);
            scheduleNext();
        }, 3000);
    }, [scheduleNext, setTodayHydrationCount]);

    if (!visible) return null;

    return (
        <div
            className="fixed bottom-5 left-5 z-[9999] w-80"
            style={{ animation: "toast-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
            <div className="glass-card p-4 border border-cyan-500/20 shadow-lg shadow-cyan-900/20">
                {!confirmed ? (
                    <>
                        <div className="flex items-start gap-3 mb-3">
                            <span className="text-2xl"></span>
                            <div>
                                <p className="text-sm font-semibold text-white">Time to hydrate</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    You&apos;ve been focused for {minutesFocused} minutes.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDrank}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
                            >
                                Drank water 
                            </button>
                            <button
                                onClick={() => setVisible(false)}
                                className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                            >
                                Dismiss
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-2xl"></span>
                        <div>
                            <p className="text-sm font-semibold text-emerald-400">Logged!</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Next reminder in {nextReminderIn} minutes.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * HydrationBadge " small pill showing today's water intake count.
 * Designed to be embedded in the Navbar.
 */
export function HydrationBadge() {
    // Hooks must be called before any early return
    const { todayHydrationCount } = useHealth();
    if (!FEATURES.hydrationReminders) return null;
    if (todayHydrationCount === 0) return null;

    return (
        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
             {todayHydrationCount} {todayHydrationCount === 1 ? "sip" : "sips"} today
        </span>
    );
}





