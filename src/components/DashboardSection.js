"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { useSensor } from "@/context/SensorContext";
import { useHealth } from "@/context/HealthContext";
import { TypingTracker } from "@/lib/typingTracker";
import { MouseTracker } from "@/lib/mouseTracker";
import SleepTracker from "@/components/health/SleepTracker";
import SleepCorrelationChart from "@/components/health/SleepCorrelationChart";
import { FEATURES } from "@/config/features";

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Filler, Tooltip, Legend
);

const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: { legend: { display: false } },
    scales: {
        x: {
            grid: { color: "rgba(255,255,255,0.03)" },
            ticks: { color: "#6b7280", font: { size: 9 }, maxRotation: 45, maxTicksLimit: 10 },
        },
        y: {
            grid: { color: "rgba(255,255,255,0.03)" },
            ticks: { color: "#6b7280", font: { size: 9 } },
            beginAtZero: true,
        },
    },
};

const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: { legend: { display: false } },
};

function CognitiveLoadGauge() {
    const { cognitiveLoad, cognitiveLabel } = useSensor();
    const getColor = (l) => {
        if (l < 40) return "#22c55e";
        if (l < 70) return "#f59e0b";
        return "#ef4444";
    };
    const color = getColor(cognitiveLoad);

    return (
        <div className="dashboard-card">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cognitive Load</h3>
                <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color, background: color + "15" }}
                >
                    {cognitiveLabel}
                </span>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                    <Doughnut
                        data={{
                            labels: ["Load", "Free"],
                            datasets: [{
                                data: [cognitiveLoad, 100 - cognitiveLoad],
                                backgroundColor: [color, "rgba(255,255,255,0.03)"],
                                borderWidth: 0,
                            }],
                        }}
                        options={doughnutOpts}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{cognitiveLoad}%</span>
                    </div>
                </div>
                <div className="flex-1">
                    <div className="text-[10px] text-gray-500 mb-1">Level</div>
                    <div className="stress-meter">
                        <div className="stress-meter-fill" style={{
                            width: `${cognitiveLoad}%`,
                            background: "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)",
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function TypingActivityChart() {
    const { wpmHistory, timeLabels } = useSensor();
    return (
        <div className="dashboard-card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Typing Speed (WPM)</h3>
            <div className="h-40">
                <Line
                    data={{
                        labels: timeLabels.length > 0 ? timeLabels : ["--"],
                        datasets: [{
                            data: wpmHistory.length > 0 ? wpmHistory : [0],
                            borderColor: "#818cf8",
                            backgroundColor: "rgba(129,140,248,0.08)",
                            fill: true, tension: 0.4, pointRadius: 2, pointBackgroundColor: "#818cf8",
                        }],
                    }}
                    options={chartOpts}
                />
            </div>
        </div>
    );
}

function BlinkChart() {
    const { blinkHistory, timeLabels } = useSensor();
    return (
        <div className="dashboard-card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Blink Rate (/min)</h3>
            <div className="h-40">
                <Bar
                    data={{
                        labels: timeLabels.length > 0 ? timeLabels : ["--"],
                        datasets: [{
                            data: blinkHistory.length > 0 ? blinkHistory : [0],
                            backgroundColor: "rgba(6,182,212,0.5)",
                            borderColor: "#06b6d4", borderWidth: 1, borderRadius: 4,
                        }],
                    }}
                    options={chartOpts}
                />
            </div>
        </div>
    );
}

function MouseActivityChart() {
    const { mouseHistory, timeLabels } = useSensor();
    return (
        <div className="dashboard-card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mouse Speed (px/s)</h3>
            <div className="h-40">
                <Line
                    data={{
                        labels: timeLabels.length > 0 ? timeLabels : ["--"],
                        datasets: [{
                            data: mouseHistory.length > 0 ? mouseHistory : [0],
                            borderColor: "#a78bfa",
                            backgroundColor: "rgba(167,139,250,0.08)",
                            fill: true, tension: 0.4, pointRadius: 2, pointBackgroundColor: "#a78bfa",
                        }],
                    }}
                    options={chartOpts}
                />
            </div>
        </div>
    );
}

function StressHistoryChart() {
    const { stressHistory, timeLabels } = useSensor();
    return (
        <div className="dashboard-card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stress Over Time</h3>
            <div className="h-40">
                <Line
                    data={{
                        labels: timeLabels.length > 0 ? timeLabels : ["--"],
                        datasets: [{
                            data: stressHistory.length > 0 ? stressHistory : [0],
                            borderColor: "#f97316",
                            backgroundColor: "rgba(249,115,22,0.08)",
                            fill: true, tension: 0.4, pointRadius: 2, pointBackgroundColor: "#f97316",
                        }],
                    }}
                    options={chartOpts}
                />
            </div>
        </div>
    );
}

function ProductivityPanel() {
    const sensor = useSensor();
    const { movementBreaks } = useHealth();
    const [elapsed, setElapsed] = useState(0);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    useEffect(() => {
        const t = setInterval(() => setElapsed(Math.floor((Date.now() - sensor.sessionStart) / 1000)), 1000);
        return () => clearInterval(t);
    }, [sensor.sessionStart]);
    const focusScore = Math.max(0, 100 - sensor.cognitiveLoad);

    return (
        <div className="dashboard-card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Session Summary</h3>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: "Focus", val: `${focusScore}%`, color: focusScore >= 50 ? "text-emerald-400" : "text-red-400" },
                    { label: "Session", val: `${mins}m ${secs}s`, color: "text-white" },
                    { label: "WPM", val: `${sensor.typingWPM}`, color: sensor.typingWPM > 0 ? "text-indigo-400" : "text-gray-500" },
                    { label: "Blinks", val: `${sensor.blinkCount}`, color: "text-cyan-400" },
                    { label: "Mouse", val: sensor.mouseActive ? "Active" : "Idle", color: sensor.mouseActive ? "text-emerald-400" : "text-gray-500" },
                    { label: "Clicks", val: `${sensor.mouseClicks}`, color: "text-purple-400" },
                    { label: "Overloads", val: `${sensor.overloadEvents}`, color: sensor.overloadEvents > 0 ? "text-orange-400" : "text-gray-500" },
                    ...(FEATURES.movementPrompts ? [{ label: "Breaks", val: `${movementBreaks}`, color: "text-teal-400" }] : []),
                ].map((m, i) => (
                    <div key={i} className="bg-white/[0.02] rounded-lg p-2.5 text-center">
                        <div className={`text-lg font-bold ${m.color}`}>{m.val}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{m.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DashboardSection() {
    const sensor = useSensor();
    const trackerRef = useRef(null);
    const mouseRef = useRef(null);
    const chartIntervalRef = useRef(null);
    const [activeTab, setActiveTab] = useState("analytics");

    useEffect(() => {
        // Typing tracker
        trackerRef.current = new TypingTracker(15000);
        trackerRef.current.start((wpm, chars) => {
            sensor.setTypingWPM(wpm);
            sensor.setTotalKeystrokes(trackerRef.current.getTotalChars());
        });

        // Mouse tracker
        mouseRef.current = new MouseTracker(10000);
        mouseRef.current.start((metrics) => {
            sensor.setMouseSpeed(metrics.speed);
            sensor.setMouseDistance(metrics.totalDistance);
            sensor.setMouseClicks(metrics.clickCount);
            sensor.setMouseActive(metrics.isActive);
            sensor.setMouseIntensity(metrics.intensity);
        });

        // Push chart data every 3 seconds
        chartIntervalRef.current = setInterval(() => {
            const wpm = trackerRef.current ? trackerRef.current.getWPM() : 0;
            const mouseMetrics = mouseRef.current ? mouseRef.current.getMetrics() : { speed: 0 };
            sensor.pushChartData(sensor.blinkRate, wpm, mouseMetrics.speed, sensor.stressLevel);
        }, 3000);

        return () => {
            if (trackerRef.current) trackerRef.current.stop();
            if (mouseRef.current) mouseRef.current.stop();
            if (chartIntervalRef.current) clearInterval(chartIntervalRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <section id="dashboard" className="relative py-12 px-6">
            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-8"
                >
                    <h2
                        className="text-3xl font-bold mb-3"
                        style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
                    >
                        <span className="gradient-text">Live Dashboard</span>
                    </h2>
                    <p className="text-gray-400 text-sm max-w-xl mx-auto">
                        Real-time analytics from webcam, typing, and mouse activity
                    </p>
                </motion.div>

                {/* Sleep Tracker " shown once per day at session start */}
                {FEATURES.sleepTracker && <SleepTracker />}

                {/* Status bar */}
                <div className="glass-card p-3 mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${sensor.isCameraActive ? "bg-emerald-500 animate-pulse" : "bg-gray-600"}`} />
                        <span className="text-xs text-gray-300">MindGuard</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span>WPM: <span className="text-indigo-400">{sensor.typingWPM}</span></span>
                        <span>|</span>
                        <span>Mouse: <span className={sensor.mouseActive ? "text-emerald-400" : "text-gray-600"}>{sensor.mouseActive ? "Active" : "Idle"}</span></span>
                        <span>|</span>
                        <span className={sensor.isCameraActive ? "text-emerald-400" : "text-gray-600"}>
                            {sensor.isCameraActive ? " Camera Live" : " Camera Off"}
                        </span>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 mb-5 p-1 bg-white/[0.03] rounded-xl border border-white/5 w-fit">
                    {["analytics", ...(FEATURES.sleepTracker ? ["sleep"] : [])].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                activeTab === tab
                                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            {tab === "analytics" ? " Analytics" : ") Sleep & Focus"}
                        </button>
                    ))}
                </div>

                {/* Analytics tab */}
                {activeTab === "analytics" && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <CognitiveLoadGauge />
                        <ProductivityPanel />
                        <StressHistoryChart />
                        <TypingActivityChart />
                        <BlinkChart />
                        <MouseActivityChart />
                    </div>
                )}

                {/* Sleep & Focus tab */}
                {activeTab === "sleep" && FEATURES.sleepTracker && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <SleepCorrelationChart />
                        <ProductivityPanel />
                    </div>
                )}
            </div>
        </section>
    );
}

