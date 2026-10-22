"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

const LS_KEY = "aura_behavioral_baseline";

/**
 * @typedef {Object} UserBaseline
 * @property {number} blinkRate   - Personal normal blink rate (blinks/min)
 * @property {number} typingWPM   - Personal normal typing speed
 * @property {number} mouseSpeed  - Personal normal mouse speed
 * @property {number} stressLevel - Personal normal stress level
 * @property {string} startHour   - Typical work start hour (HH)
 * @property {string} endHour     - Typical work end hour (HH)
 * @property {number} sessionLength - Personal average session length (min)
 * @property {number} sampleCount  - How many sessions have been sampled
 */

/**
 * @typedef {Object} PersonalizationContextValue
 * @property {UserBaseline} baseline  - Learned user baseline
 * @property {Function} updateBaseline - Submit a new data point for learning
 * @property {string[]} deviations    - Current detected deviations
 * @property {number} burnoutRisk7d   - 7-day rolling burnout risk score
 */

const PersonalizationContext = createContext(null);

const DEFAULT_BASELINE = {
    blinkRate: 18,
    typingWPM: 50,
    mouseSpeed: 200,
    stressLevel: 30,
    startHour: "09",
    endHour: "18",
    sessionLength: 45,
    sampleCount: 0,
};

function loadBaseline() {
    if (typeof window === "undefined") return DEFAULT_BASELINE;
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? { ...DEFAULT_BASELINE, ...JSON.parse(raw) } : DEFAULT_BASELINE;
    } catch { return DEFAULT_BASELINE; }
}

function saveBaseline(b) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(b)); } catch { }
}

/**
 * Exponential moving average update.
 * @param {number} prev - Previous value
 * @param {number} next - New observation
 * @param {number} alpha - Learning rate (0-1)
 */
function ema(prev, next, alpha = 0.15) {
    return prev + alpha * (next - prev);
}

export function PersonalizationProvider({ children }) {
    const [baseline, setBaseline] = useState(DEFAULT_BASELINE);
    const [deviations, setDeviations] = useState([]);
    const [burnoutRisk7d, setBurnoutRisk7d] = useState(15);

    // Load on mount
    useEffect(() => {
        const b = loadBaseline();
        const t = setTimeout(() => setBaseline(b), 0);
        return () => clearTimeout(t);
    }, []);

    function computeBurnoutRisk7d() {
        try {
            const raw = localStorage.getItem("aura_daily_stress");
            const data = raw ? JSON.parse(raw) : [];
            if (data.length < 2) { setBurnoutRisk7d(15); return; }
            const recent = data.slice(-7);
            const avgStress = recent.reduce((a, b) => a + b.stress, 0) / recent.length;
            const trend = recent.length > 2
                ? (recent[recent.length - 1].stress - recent[0].stress) / recent.length
                : 0;
            const risk = Math.min(100, Math.max(0, avgStress * 0.6 + trend * 10));
            setBurnoutRisk7d(Math.round(risk));
        } catch { }
    }

    /**
     * Submit a new sensor snapshot for baseline learning.
     * Called every 60 seconds from the dashboard.
     * @param {{ blinkRate: number, typingWPM: number, mouseSpeed: number, stressLevel: number }} snapshot
     */
    const updateBaseline = useCallback((snapshot) => {
        setBaseline((prev) => {
            const sampleCount = prev.sampleCount + 1;
            // After 10 samples, start learning
            if (sampleCount < 5) {
                const next = { ...prev, sampleCount };
                saveBaseline(next);
                return next;
            }
            const alpha = Math.max(0.05, 0.2 / Math.sqrt(sampleCount)); // decay learning rate
            const next = {
                ...prev,
                blinkRate:   ema(prev.blinkRate,   snapshot.blinkRate,   alpha),
                typingWPM:   ema(prev.typingWPM,   snapshot.typingWPM > 0 ? snapshot.typingWPM : prev.typingWPM, alpha),
                mouseSpeed:  ema(prev.mouseSpeed,  snapshot.mouseSpeed,  alpha),
                stressLevel: ema(prev.stressLevel, snapshot.stressLevel, alpha),
                sampleCount,
            };
            saveBaseline(next);

            // Detect deviations
            const devs = [];
            if (snapshot.blinkRate > 0 && Math.abs(snapshot.blinkRate - next.blinkRate) / next.blinkRate > 0.4) {
                devs.push(snapshot.blinkRate < next.blinkRate
                    ? "Blink rate 40% below your normal - possible eye fatigue"
                    : "Blink rate elevated - possible stress or dry eyes");
            }
            if (snapshot.typingWPM > 0 && (next.typingWPM - snapshot.typingWPM) / next.typingWPM > 0.35) {
                devs.push("Typing speed dropped 35% from your baseline - cognitive slowdown detected");
            }
            if (snapshot.stressLevel - next.stressLevel > 25) {
                devs.push("Stress level significantly above your personal baseline");
            }
            setDeviations(devs);

            return next;
        });

        // Update 7-day burnout risk from localStorage history
        computeBurnoutRisk7d();
    }, []);

    /**
     * Records today's average stress to localStorage for burnout tracking.
     * @param {number} avgStress
     */
    const recordDailyStress = useCallback((avgStress) => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const raw = localStorage.getItem("aura_daily_stress");
            const data = raw ? JSON.parse(raw) : [];
            const filtered = data.filter((d) => d.date !== today);
            filtered.push({ date: today, stress: avgStress });
            localStorage.setItem("aura_daily_stress", JSON.stringify(filtered.slice(-30)));
        } catch { }
    }, []);

    const value = {
        baseline,
        updateBaseline,
        deviations,
        burnoutRisk7d,
        recordDailyStress,
    };

    return (
        <PersonalizationContext.Provider value={value}>
            {children}
        </PersonalizationContext.Provider>
    );
}

export function usePersonalization() {
    const ctx = useContext(PersonalizationContext);
    if (!ctx) throw new Error("usePersonalization must be used within PersonalizationProvider");
    return ctx;
}


