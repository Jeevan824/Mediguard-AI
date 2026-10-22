"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";

/**
 * @typedef {Object} HealthContextValue
 * @property {boolean} breathingOpen - Whether the breathing guide is currently displayed
 * @property {Function} triggerBreathing - Manually open the breathing guide
 * @property {Function} closeBreathing - Close the breathing guide
 * @property {number} todayHydrationCount - Water intake count for today's session
 * @property {Function} setTodayHydrationCount - Setter for todayHydrationCount
 * @property {number} movementBreaks - Total movement breaks taken this session
 * @property {Function} setMovementBreaks - Setter for movementBreaks
 * @property {number} screenDistanceAlerts - Total screen-distance alerts this session
 * @property {Function} setScreenDistanceAlerts - Setter for screenDistanceAlerts
 */

const HealthContext = createContext(null);

/**
 * Provider that wraps the app and supplies shared health-module state.
 * Must be mounted INSIDE SensorProvider so child components can access both contexts.
 * @param {{ children: React.ReactNode }} props
 */
export function HealthProvider({ children }) {
    const [breathingOpen, setBreathingOpen] = useState(false);
    const [todayHydrationCount, setTodayHydrationCount] = useState(0);
    const [movementBreaks, setMovementBreaks] = useState(0);
    const [screenDistanceAlerts, setScreenDistanceAlerts] = useState(0);

    /** @type {React.MutableRefObject<boolean>} */
    const breathingManualRef = useRef(false);

    /**
     * Opens the breathing guide (manual trigger — bypasses auto-trigger throttle).
     */
    const triggerBreathing = useCallback(() => {
        breathingManualRef.current = true;
        setBreathingOpen(true);
    }, []);

    /**
     * Closes the breathing guide.
     */
    const closeBreathing = useCallback(() => {
        setBreathingOpen(false);
        breathingManualRef.current = false;
    }, []);

    const value = {
        breathingOpen, setBreathingOpen,
        triggerBreathing, closeBreathing,
        breathingManualRef,
        todayHydrationCount, setTodayHydrationCount,
        movementBreaks, setMovementBreaks,
        screenDistanceAlerts, setScreenDistanceAlerts,
    };

    return (
        <HealthContext.Provider value={value}>
            {children}
        </HealthContext.Provider>
    );
}

/**
 * Hook to consume HealthContext.
 * @returns {HealthContextValue}
 */
export function useHealth() {
    const ctx = useContext(HealthContext);
    if (!ctx) throw new Error("useHealth must be used within HealthProvider");
    return ctx;
}
