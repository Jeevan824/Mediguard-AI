"use client";
/**
 * Starts mouse tracking once for the whole app.
 * Live metrics are written to SensorContext only when Demo Mode is off.
 * A separate liveMouse status object always updates so the demo can prove
 * movement/clicks without mixing them into example CSV values.
 */
import { useEffect, useRef } from "react";
import { MouseTracker } from "@/lib/mouseTracker";
import { useSensor } from "@/context/SensorContext";
import { useDataset } from "@/context/DatasetContext";

export default function MouseLiveHost() {
    const sensor = useSensor();
    const { demoMode } = useDataset();
    const demoRef = useRef(demoMode);
    const trackerRef = useRef(null);
    const lastClickCountRef = useRef(0);
    const lastClickAtRef = useRef(0);

    useEffect(() => {
        demoRef.current = demoMode;
    }, [demoMode]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const tracker = new MouseTracker(5000);
        trackerRef.current = tracker;

        sensor.setLiveMouse({
            status: "starting",
            reason: "Registering pointer listeners on document.",
            speed: 0,
            clicks: 0,
            intensity: 0,
            isActive: false,
            idleMs: 0,
            jerkiness: 0,
            lastMoveAt: 0,
            lastClickAt: 0,
        });

        tracker.start((metrics) => {
            if (metrics.clickCount > lastClickCountRef.current) {
                lastClickCountRef.current = metrics.clickCount;
                lastClickAtRef.current = Date.now();
            }
            const listening = tracker.isListening && !tracker.startError;
            sensor.setLiveMouse({
                status: listening ? "listening" : "error",
                reason: tracker.startError
                    ? tracker.startError
                    : listening
                        ? "Listening for pointermove / pointerdown on document (capture)."
                        : "Listeners did not attach.",
                speed: metrics.speed,
                clicks: metrics.clickCount,
                intensity: metrics.intensity,
                isActive: metrics.isActive,
                idleMs: metrics.idleMs,
                jerkiness: metrics.jerkiness,
                lastMoveAt: metrics.isActive ? Date.now() : 0,
                lastClickAt: lastClickAtRef.current,
            });

            if (!demoRef.current) {
                sensor.setMouseSpeed(metrics.speed);
                sensor.setMouseDistance(metrics.totalDistance);
                sensor.setMouseClicks(metrics.clickCount);
                sensor.setMouseActive(metrics.isActive);
                sensor.setMouseIntensity(metrics.intensity);
                sensor.setJerkiness(metrics.jerkiness);
                sensor.setIdlePauses(metrics.idlePauses);
            }
        });

        if (tracker.startError) {
            sensor.setLiveMouse((prev) => ({
                ...prev,
                status: "error",
                reason: tracker.startError,
            }));
        }

        return () => {
            tracker.stop();
            trackerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
