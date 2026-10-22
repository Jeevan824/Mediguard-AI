"use client";
import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { scoreToColor, scoreToState } from "@/config/auraTheme";

/**
 * @typedef {Object} WellnessMetrics
 * @property {number} stressScore    - 0-100
 * @property {number} fatigueScore   - 0-100
 * @property {number} focusScore     - 0-100
 * @property {number} cognitiveLoad  - 0-100
 * @property {number} burnoutRisk    - 0-100
 * @property {number} recoveryNeed   - 0-100
 * @property {number} energyLevel    - 0-100
 * @property {number} wellnessScore  - 0-100 (composite)
 */

/**
 * @typedef {Object} AuraContextValue
 * @property {WellnessMetrics} wellness - Current wellness dimensions
 * @property {Function} updateWellness  - Update wellness metrics
 * @property {string} cognitiveState    - Human-readable state label
 * @property {string} stateColor        - Hex color for current state
 * @property {Object[]} interventionQueue - Pending interventions
 * @property {Function} addIntervention
 * @property {Function} clearIntervention
 * @property {Object[]} eventLog        - Timestamped wellness events
 * @property {Function} logEvent
 * @property {string} activeTheme       - 'void' | 'aurora' | 'solar'
 * @property {Function} setActiveTheme
 */

const AuraContext = createContext(null);

export function AuraProvider({ children }) {
    const [wellness, setWellness] = useState({
        stressScore: 0,
        fatigueScore: 0,
        focusScore: 80,
        cognitiveLoad: 0,
        burnoutRisk: 15,
        recoveryNeed: 20,
        energyLevel: 80,
        wellnessScore: 80,
    });

    const [interventionQueue, setInterventionQueue] = useState([]);
    const [eventLog, setEventLog] = useState([]);
    const [activeTheme, setActiveTheme] = useState("void");
    const lastInterventionRef = useRef(null);

    const cognitiveState = scoreToState(wellness.wellnessScore);
    const stateColor = scoreToColor(wellness.wellnessScore);

    /**
     * Updates wellness dimensions and recomputes composite score.
     * @param {Partial<WellnessMetrics>} updates
     */
    const updateWellness = useCallback((updates) => {
        setWellness((prev) => {
            const next = { ...prev, ...updates };
            // Composite wellness score (higher = better)
            const rawComposite =
                (100 - next.stressScore) * 0.25 +
                (100 - next.fatigueScore) * 0.20 +
                next.focusScore * 0.20 +
                (100 - next.cognitiveLoad) * 0.15 +
                (100 - next.burnoutRisk) * 0.10 +
                next.energyLevel * 0.10;
            if (typeof updates.wellnessScore === "number" && !Number.isNaN(updates.wellnessScore)) {
                next.wellnessScore = Math.round(Math.max(0, Math.min(100, updates.wellnessScore)));
            } else {
                next.wellnessScore = Math.round(Math.max(0, Math.min(100, rawComposite)));
            }
            return next;
        });
    }, []);

    /**
     * Adds an intervention to the priority queue (deduplicated by type).
     * @param {{ id: string, type: string, title: string, message: string, priority: number, action?: Function }} intervention
     */
    const addIntervention = useCallback((intervention) => {
        const now = Date.now();
        if (lastInterventionRef.current && now - lastInterventionRef.current < 5 * 60 * 1000) return;
        setInterventionQueue((prev) => {
            if (prev.find((i) => i.type === intervention.type)) return prev;
            lastInterventionRef.current = now;
            return [...prev, { ...intervention, timestamp: now }].sort((a, b) => b.priority - a.priority);
        });
    }, []);

    /**
     * Removes an intervention by id.
     * @param {string} id
     */
    const clearIntervention = useCallback((id) => {
        setInterventionQueue((prev) => prev.filter((i) => i.id !== id));
    }, []);

    /**
     * Logs a timestamped wellness event.
     * @param {string} type
     * @param {string} message
     * @param {Object} [data]
     */
    const logEvent = useCallback((type, message, data = {}) => {
        setEventLog((prev) => [
            { id: Date.now(), type, message, data, timestamp: Date.now() },
            ...prev.slice(0, 499),
        ]);
    }, []);

    const value = {
        wellness,
        updateWellness,
        cognitiveState,
        stateColor,
        interventionQueue,
        addIntervention,
        clearIntervention,
        eventLog,
        logEvent,
        activeTheme,
        setActiveTheme,
    };

    return <AuraContext.Provider value={value}>{children}</AuraContext.Provider>;
}

/**
 * Hook to consume AuraContext.
 * @returns {AuraContextValue}
 */
export function useAura() {
    const ctx = useContext(AuraContext);
    if (!ctx) throw new Error("useAura must be used within AuraProvider");
    return ctx;
}
