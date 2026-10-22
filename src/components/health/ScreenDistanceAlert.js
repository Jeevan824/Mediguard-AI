"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSensor } from "@/context/SensorContext";
import { useHealth } from "@/context/HealthContext";
import { FEATURES } from "@/config/features";

const CALIBRATION_FRAMES = 60;
const FALLBACK_THRESHOLD_PX = 160;
const CLOSE_RATIO = 1.35;
const VERY_CLOSE_RATIO = 1.55;
const THROTTLE_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Computes the interpupillary distance in pixels between landmarks 33 (left eye outer)
 * and 263 (right eye outer) using normalised [0,1] coordinates  canvas dimensions.
 * @param {Array<{x:number, y:number}>} landmarks - MediaPipe normalised landmarks
 * @param {number} width - canvas width in pixels
 * @param {number} height - canvas height in pixels
 * @returns {number} IPD in pixels
 */
function computeIPD(landmarks, width, height) {
    const l = landmarks[33];
    const r = landmarks[263];
    const dx = (r.x - l.x) * width;
    const dy = (r.y - l.y) * height;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * ScreenDistanceAlert " mounts inside DetectionSection after the landmark canvas.
 * Estimates screen distance via IPD (interpupillary pixel distance) and shows
 * a yellow or orange banner when the user is too close.
 */
export default function ScreenDistanceAlert() {
    if (!FEATURES.screenDistanceAlert) return null;
    return <ScreenDistanceAlertInner />;
}

function ScreenDistanceAlertInner() {
    const { faceLandmarks } = useSensor();
    const { setScreenDistanceAlerts } = useHealth();

    const [alertLevel, setAlertLevel] = useState(null); // null | 'close' | 'veryClose'
    const [isCalibrating, setIsCalibrating] = useState(true);
    const [baselineIPD, setBaselineIPD] = useState(null);
    const [recalibrating, setRecalibrating] = useState(false);
    const [calibrationProgress, setCalibrationProgress] = useState(0);

    const calibrationFramesRef = useRef([]);
    const calibratingRef = useRef(true);
    const baselineIPDRef = useRef(null);
    const lastCloseAlertRef = useRef(null);
    const lastVeryCloseAlertRef = useRef(null);
    const dismissTimerRef = useRef(null);
    const landmarksRef = useRef(faceLandmarks);

    useEffect(() => { landmarksRef.current = faceLandmarks; }, [faceLandmarks]);

    /** Canvas dimensions for IPD calculation (match the canvas in DetectionSection) */
    const CANVAS_W = 640;
    const CANVAS_H = 480;

    /**
     * Starts or restarts calibration by collecting the next 60 frames.
     */
    const startCalibration = useCallback(() => {
        calibrationFramesRef.current = [];
        calibratingRef.current = true;
        setIsCalibrating(true);
        setBaselineIPD(null);
        baselineIPDRef.current = null;
        setAlertLevel(null);
        setRecalibrating(false);
    }, []);

    // IPD monitoring loop " runs every 500ms
    useEffect(() => {
        const interval = setInterval(() => {
            const lm = landmarksRef.current;
            if (!lm || lm.length < 264) return;

            const ipd = computeIPD(lm, CANVAS_W, CANVAS_H);

            // --- Calibration phase ---
            if (calibratingRef.current) {
                calibrationFramesRef.current.push(ipd);
                setCalibrationProgress(calibrationFramesRef.current.length);
                if (calibrationFramesRef.current.length >= CALIBRATION_FRAMES) {
                    // Compute median
                    const sorted = [...calibrationFramesRef.current].sort((a, b) => a - b);
                    const median = sorted[Math.floor(sorted.length / 2)];
                    baselineIPDRef.current = median;
                    setBaselineIPD(Math.round(median));
                    calibratingRef.current = false;
                    setIsCalibrating(false);
                }
                return;
            }

            // --- Alert phase ---
            const baseline = baselineIPDRef.current ?? FALLBACK_THRESHOLD_PX / CLOSE_RATIO;
            const now = Date.now();

            if (ipd > baseline * VERY_CLOSE_RATIO) {
                if (!lastVeryCloseAlertRef.current || now - lastVeryCloseAlertRef.current > THROTTLE_MS) {
                    lastVeryCloseAlertRef.current = now;
                    setScreenDistanceAlerts((n) => n + 1);
                }
                setAlertLevel("veryClose");
                if (dismissTimerRef.current) {
                    clearTimeout(dismissTimerRef.current);
                    dismissTimerRef.current = null;
                }
            } else if (ipd > baseline * CLOSE_RATIO) {
                if (!lastCloseAlertRef.current || now - lastCloseAlertRef.current > THROTTLE_MS) {
                    lastCloseAlertRef.current = now;
                    setScreenDistanceAlerts((n) => n + 1);
                }
                setAlertLevel("close");
                // Auto-dismiss after 8s if user moves back
                if (!dismissTimerRef.current) {
                    dismissTimerRef.current = setTimeout(() => {
                        setAlertLevel(null);
                        dismissTimerRef.current = null;
                    }, 8000);
                }
            } else {
                // User moved back " clear very-close alert
                if (alertLevel === "veryClose") setAlertLevel(null);
            }
        }, 500);

        return () => {
            clearInterval(interval);
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        };
    }, [alertLevel, setScreenDistanceAlerts]);

    return (
        <div className="mt-3 space-y-2">
            {/* Calibration indicator */}
            {isCalibrating && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-[11px] text-gray-400">
                        Calibrating screen distance... ({Math.min(calibrationProgress, CALIBRATION_FRAMES)}/{CALIBRATION_FRAMES} frames)
                    </span>
                </div>
            )}

            {/* Baseline info + recalibrate button */}
            {!isCalibrating && baselineIPD && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.02]">
                    <span className="text-[10px] text-gray-500">
                        Baseline IPD: <span className="text-indigo-400">{baselineIPD}px</span>
                    </span>
                    <button
                        onClick={startCalibration}
                        className="text-[10px] text-gray-500 hover:text-indigo-400 transition-colors"
                    >
                         Recalibrate distance
                    </button>
                </div>
            )}

            {/* Close alert */}
            {alertLevel === "close" && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                    style={{ animation: "toast-in 0.3s ease both" }}>
                    <span className="text-base"></span>
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-yellow-400">Move back a little</p>
                        <p className="text-[10px] text-yellow-400/60">Your eyes will thank you.</p>
                    </div>
                    <button
                        onClick={() => setAlertLevel(null)}
                        className="text-yellow-500/40 hover:text-yellow-400 text-xs transition-colors"
                    >
                        
                    </button>
                </div>
            )}

            {/* Very close alert " persistent */}
            {alertLevel === "veryClose" && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30"
                    style={{ animation: "toast-in 0.3s ease both" }}>
                    <span className="text-base"></span>
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-orange-400">Screen too close!</p>
                        <p className="text-[10px] text-orange-400/60">Risk of eye strain - please move back.</p>
                    </div>
                </div>
            )}
        </div>
    );
}



