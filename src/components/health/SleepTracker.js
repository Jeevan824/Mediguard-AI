"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSensor } from "@/context/SensorContext";
import { FEATURES } from "@/config/features";

const LS_KEY = "mindguard_sleep_log";

/**
 * Returns today's date string YYYY-MM-DD.
 * @returns {string}
 */
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Loads all sleep log entries from localStorage.
 * @returns {Array<Object>}
 */
export function loadSleepLog() {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

/**
 * Saves a single entry to the sleep log. Replaces any entry for the same date.
 * @param {Object} entry
 */
function saveSleepEntry(entry) {
    try {
        const log = loadSleepLog().filter((e) => e.date !== entry.date);
        log.push(entry);
        localStorage.setItem(LS_KEY, JSON.stringify(log));
    } catch { /* ignore */ }
}

/**
 * Fills in session metrics for today's sleep entry.
 * @param {number} avgStress
 * @param {number} avgCognitiveLoad
 * @param {number} focusScore
 */
export function fillSleepSessionData(avgStress, avgCognitiveLoad, focusScore) {
    const log = loadSleepLog();
    const today = todayStr();
    const entry = log.find((e) => e.date === today);
    if (!entry) return;
    entry.avgStress = avgStress;
    entry.avgCognitiveLoad = avgCognitiveLoad;
    entry.focusScore = focusScore;
    localStorage.setItem(LS_KEY, JSON.stringify(log));
}

const DURATION_OPTIONS = ["<5h", "5–6h", "6–7h", "7–8h", "8h+"];

/**
 * SleepTracker — mounts at top of DashboardSection.
 * Shows a compact slide-in card once per day asking about last night's sleep.
 */
export default function SleepTracker() {
    if (!FEATURES.sleepTracker) return null;
    return <SleepTrackerInner />;
}

function SleepTrackerInner() {
    const { stressHistory, cognitiveLoad, sessionStart } = useSensor();
    const [visible, setVisible] = useState(false);
    const [quality, setQuality] = useState(0);
    const [duration, setDuration] = useState("7–8h");
    const [note, setNote] = useState("");
    const [saved, setSaved] = useState(false);

    // Check on mount whether we should show the form today
    useEffect(() => {
        const today = todayStr();
        try {
            const skipped = localStorage.getItem("mindguard_sleep_skip");
            if (skipped === today) return;
        } catch { /* ignore */ }

        const log = loadSleepLog();
        const alreadyLogged = log.some((e) => e.date === today);
        if (!alreadyLogged) {
            // Small delay so page loads first
            const t = setTimeout(() => setVisible(true), 2000);
            return () => clearTimeout(t);
        }
    }, []);

    // Fill session stats on page unload
    useEffect(() => {
        const handleUnload = () => {
            const elapsed = (Date.now() - sessionStart) / 1000;
            const avgStress = stressHistory.length > 0
                ? Math.round(stressHistory.reduce((a, b) => a + b, 0) / stressHistory.length)
                : 0;
            const avgCognitive = cognitiveLoad;
            const focusScore = Math.max(0, 100 - avgCognitive);
            fillSleepSessionData(avgStress, avgCognitive, focusScore);
        };
        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, [stressHistory, cognitiveLoad, sessionStart]);

    /**
     * Saves the sleep entry and hides the card.
     */
    const handleSave = useCallback(() => {
        const entry = {
            date: todayStr(),
            quality,
            duration,
            note: note.slice(0, 80),
            avgStress: null,
            avgCognitiveLoad: null,
            focusScore: null,
        };
        saveSleepEntry(entry);
        setSaved(true);
        setTimeout(() => setVisible(false), 2000);
    }, [quality, duration, note]);

    /**
     * Skips the form for 24h by persisting today's date to localStorage.
     */
    const handleSkip = useCallback(() => {
        try {
            localStorage.setItem("mindguard_sleep_skip", todayStr());
        } catch { /* ignore */ }
        setVisible(false);
    }, []);

    if (!visible) return null;

    return (
        <div
            className="mb-4"
            style={{ animation: "toast-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
            <div className="glass-card p-5 border border-indigo-500/20">
                {saved ? (
                    <div className="flex items-center gap-3 justify-center py-2">
                        <span className="text-2xl">🌙</span>
                        <span className="text-sm font-semibold text-emerald-400">Sleep logged! Sweet dreams help focus.</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🌙</span>
                                <h3 className="text-sm font-bold text-white">How did you sleep last night?</h3>
                            </div>
                            <button
                                onClick={handleSkip}
                                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                Skip
                            </button>
                        </div>

                        {/* Star quality selector */}
                        <div className="mb-4">
                            <label className="text-[11px] text-gray-400 block mb-1.5">Quality</label>
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setQuality(star)}
                                        className={`text-xl transition-all hover:scale-110 ${star <= quality ? "opacity-100" : "opacity-25"}`}
                                    >
                                        ⭐
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Duration dropdown */}
                        <div className="mb-4">
                            <label className="text-[11px] text-gray-400 block mb-1.5">Duration</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                            >
                                {DURATION_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt} className="bg-[#0f0f23]">{opt}</option>
                                ))}
                            </select>
                        </div>

                        {/* Optional note */}
                        <div className="mb-4">
                            <label className="text-[11px] text-gray-400 block mb-1.5">Note (optional)</label>
                            <input
                                type="text"
                                maxLength={80}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g. Woke up twice..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={quality === 0}
                            className="w-full py-2 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Log sleep
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
