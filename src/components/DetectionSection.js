"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSensor } from "@/context/SensorContext";
import { useHealth } from "@/context/HealthContext";
import {
    initFaceDetection,
    calculateEAR,
    EARSmoother,
    BlinkDetector,
    drawLandmarks,
} from "@/lib/faceDetection";
import { calculateCognitiveLoad } from "@/lib/cognitiveLoad";
import ScreenDistanceAlert from "@/components/health/ScreenDistanceAlert";
import { FEATURES } from "@/config/features";

export default function DetectionSection() {
    const sensor = useSensor();
    const { screenDistanceAlerts } = useHealth();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const blinkDetectorRef = useRef(null);
    const earSmootherRef = useRef(null);
    const cleanupRef = useRef(null);
    const [cameraError, setCameraError] = useState(null);
    const [landmarkCount, setLandmarkCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [blinkThreshold, setBlinkThreshold] = useState(0.200);
    const frameCountRef = useRef(0);
    const fpsIntervalRef = useRef(null);

    const startCamera = async () => {
        if (sensor.isCameraActive) return;
        setCameraError(null);

        try {
            if (!blinkDetectorRef.current) {
                blinkDetectorRef.current = new BlinkDetector(0.2, 2, 8);
                setBlinkThreshold(blinkDetectorRef.current.getThreshold());
            }
            if (!earSmootherRef.current) {
                earSmootherRef.current = new EARSmoother(0.3);
            }

            // FPS counter
            fpsIntervalRef.current = setInterval(() => {
                setFps(frameCountRef.current);
                frameCountRef.current = 0;
            }, 1000);

            const cleanup = await initFaceDetection(videoRef.current, (results) => {
                frameCountRef.current++;

                if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                    sensor.setFaceLandmarks(null);
                    setLandmarkCount(0);
                    return;
                }

                const landmarks = results.multiFaceLandmarks[0];
                sensor.setFaceLandmarks(landmarks);
                setLandmarkCount(landmarks.length);

                // Draw landmarks
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext("2d");
                    drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
                }

                // EAR with smoothing
                const rawEAR = calculateEAR(landmarks);
                const smoothedEAR = earSmootherRef.current.update(rawEAR);
                sensor.setEyeAspectRatio(parseFloat(smoothedEAR.toFixed(3)));

                // Blink detection
                const blinked = blinkDetectorRef.current.update(smoothedEAR);
                if (blinked) {
                    sensor.setBlinkCount(blinkDetectorRef.current.getTotalBlinks());
                    setBlinkThreshold(blinkDetectorRef.current.getThreshold());
                }

                const bpm = blinkDetectorRef.current.getBlinksPerMinute();
                sensor.setBlinkRate(bpm);

                // Cognitive load with mouse
                const { load, label, stress } = calculateCognitiveLoad(
                    bpm,
                    sensor.typingWPM,
                    smoothedEAR,
                    sensor.mouseIntensity
                );
                sensor.setCognitiveLoad(load);
                sensor.setCognitiveLabel(label);
                sensor.setStressLevel(stress);
            });

            cleanupRef.current = cleanup;
            sensor.setIsCameraActive(true);
        } catch (err) {
            console.error("Camera init failed:", err);
            setCameraError("Could not access webcam. Please allow camera permissions.");
        }
    };

    const stopCamera = () => {
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }
        if (fpsIntervalRef.current) {
            clearInterval(fpsIntervalRef.current);
            fpsIntervalRef.current = null;
        }
        sensor.setIsCameraActive(false);
        sensor.setFaceLandmarks(null);
        setLandmarkCount(0);
        setFps(0);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    useEffect(() => {
        return () => {
            if (cleanupRef.current) cleanupRef.current();
            if (fpsIntervalRef.current) clearInterval(fpsIntervalRef.current);
        };
    }, []);

    const getStressColor = (l) => {
        if (l < 35) return "#22c55e";
        if (l < 65) return "#f59e0b";
        return "#ef4444";
    };

    return (
        <section id="detection" className="relative py-12 px-6">
            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-10"
                >
                    <h2
                        className="text-3xl font-bold mb-3"
                        style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
                    >
                        <span className="gradient-text">AI Detection</span>
                    </h2>
                    <p className="text-gray-400 text-sm max-w-xl mx-auto">
                        Real-time face tracking, blink detection, and stress analysis via MediaPipe FaceMesh
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-5 gap-6">
                    {/* Camera feed " 3 cols */}
                    <div className="lg:col-span-3 dashboard-card overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${sensor.isCameraActive ? "bg-red-500 animate-pulse" : "bg-gray-600"}`} />
                                <span className="text-xs text-gray-400 font-mono">
                                    {sensor.isCameraActive ? "CAMERA - LIVE" : "CAMERA - OFF"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {sensor.isCameraActive && (
                                    <span className="text-xs text-gray-500 font-mono">{fps} FPS</span>
                                )}
                                <button
                                    onClick={sensor.isCameraActive ? stopCamera : startCamera}
                                    className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${sensor.isCameraActive
                                            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                        }`}
                                >
                                    {sensor.isCameraActive ? " Stop" : " Start Camera"}
                                </button>
                            </div>
                        </div>

                        <div className="relative bg-black/50 rounded-xl aspect-[4/3] overflow-hidden border border-white/5">
                            <div
                                className="absolute inset-0 opacity-[0.07] pointer-events-none z-10"
                                style={{
                                    backgroundImage: `linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)`,
                                    backgroundSize: "24px 24px",
                                }}
                            />

                            {/* Detection corners */}
                            <div className="absolute inset-3 border border-indigo-500/15 rounded-lg pointer-events-none z-10">
                                <div className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-indigo-400/70" />
                                <div className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-indigo-400/70" />
                                <div className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-indigo-400/70" />
                                <div className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-indigo-400/70" />
                            </div>

                            <video
                                ref={videoRef}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ transform: "scaleX(-1)" }}
                                playsInline
                                muted
                            />

                            <canvas
                                ref={canvasRef}
                                width={640}
                                height={480}
                                className="absolute inset-0 w-full h-full z-20"
                                style={{ transform: "scaleX(-1)" }}
                            />

                            {/* Screen Distance Alert " after landmark canvas */}
                            {FEATURES.screenDistanceAlert && (
                                <div className="absolute bottom-10 left-0 right-0 z-30 px-3">
                                    <ScreenDistanceAlert />
                                </div>
                            )}

                            {!sensor.isCameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                    <div className="text-5xl mb-4 opacity-20"> - </div>
                                    <p className="text-sm text-gray-500 mb-1">Camera not active</p>
                                    <p className="text-xs text-gray-600">Click &quot;Start Camera&quot; to begin AI detection</p>
                                    {cameraError && (
                                        <p className="text-xs text-red-400 mt-3 max-w-[280px] text-center bg-red-400/5 px-3 py-2 rounded-lg">{cameraError}</p>
                                    )}
                                </div>
                            )}

                            {/* Bottom info bar */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-3 py-1.5 flex items-center justify-between z-20">
                                <span className="text-[10px] font-mono text-indigo-400/70">
                                    {landmarkCount > 0 ? `${landmarkCount} landmarks` : "No face"}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500">
                                    EAR: {sensor.eyeAspectRatio.toFixed(3)} | Threshold: {blinkThreshold.toFixed(3)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Side panels " 2 cols */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* Stress meter */}
                        <div className="dashboard-card">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Stress Level</h3>
                            <div className="flex items-end gap-3 mb-3">
                                <span
                                    className="text-4xl font-bold transition-colors duration-500"
                                    style={{ color: getStressColor(sensor.stressLevel) }}
                                >
                                    {sensor.stressLevel}
                                </span>
                                <span className="text-sm text-gray-500 mb-1">/ 100</span>
                            </div>
                            <div className="stress-meter mb-2">
                                <div
                                    className="stress-meter-fill"
                                    style={{
                                        width: `${sensor.stressLevel}%`,
                                        background: "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)",
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-600">
                                <span>Relaxed</span>
                                <span>Moderate</span>
                                <span>Stressed</span>
                            </div>
                        </div>

                        {/* Detection metrics */}
                        <div className="dashboard-card flex-1">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Live Metrics</h3>
                            <div className="space-y-2">
                                {[
                                    { label: "Blink Rate", value: `${sensor.blinkRate}/min`, good: sensor.blinkRate <= 25 },
                                    { label: "Eye Aspect Ratio", value: sensor.eyeAspectRatio.toFixed(3), good: sensor.eyeAspectRatio >= 0.22 },
                                    { label: "Total Blinks", value: `${sensor.blinkCount}`, good: true },
                                    { label: "Face Detected", value: sensor.faceLandmarks ? "Yes" : "No", good: !!sensor.faceLandmarks },
                                    { label: "Typing Speed", value: `${sensor.typingWPM} WPM`, good: sensor.typingWPM > 0 },
                                    { label: "Keystrokes", value: `${sensor.totalKeystrokes}`, good: true },
                                    { label: "Mouse Speed", value: `${sensor.mouseSpeed} px/s`, good: sensor.mouseActive },
                                    { label: "Mouse Clicks", value: `${sensor.mouseClicks}`, good: true },
                                    ...(FEATURES.screenDistanceAlert ? [{ label: "Distance Alerts", value: `${screenDistanceAlerts}`, good: screenDistanceAlerts === 0 }] : []),
                                ].map((m, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                        <span className="text-[11px] text-gray-500">{m.label}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-white font-medium">{m.value}</span>
                                            <div className={`w-1.5 h-1.5 rounded-full ${m.good ? "bg-emerald-400" : "bg-red-400"}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

