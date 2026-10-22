"use client";
import { useAura } from "@/context/AuraContext";
import { useDataset } from "@/context/DatasetContext";
import { useState, useEffect } from "react";
import { useSensor } from "@/context/SensorContext";
import { usePersonalization } from "@/context/PersonalizationContext";
import { motion } from "framer-motion";
import AuraCard, { AuraCardHeader } from "@/components/aura/AuraCard";
import { scoreToColor } from "@/config/auraTheme";
import { Line, Radar, Bar } from "react-chartjs-2";
import {
    Chart as ChartJS, CategoryScale, LinearScale,
    PointElement, LineElement, BarElement, RadialLinearScale,
    Filler, Tooltip, Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, RadialLinearScale, Filler, Tooltip, Legend);

export default function AnalyticsPage() {
    return <AnalyticsContent />;
}

function AnalyticsContent() {
    const [sessionMins, setSessionMins] = useState(0);
    const { wellness, cognitiveState, stateColor, eventLog } = useAura();
    const { demoMode, currentRow } = useDataset();
    const sensor = useSensor();
    const { deviations, baseline } = usePersonalization();
    useEffect(() => {
        const t = setInterval(() => setSessionMins(Math.round((Date.now() - sensor.sessionStart) / 60000)), 1000);
        return () => clearInterval(t);
    }, [sensor.sessionStart]);

    const radarData = {
        labels: ["Focus", "Energy", "Recovery", "Low Stress", "Low Fatigue", "Low Burnout"],
        datasets: [{
            label: "Current",
            data: [
                wellness.focusScore,
                wellness.energyLevel,
                100 - wellness.recoveryNeed,
                100 - wellness.stressScore,
                100 - wellness.fatigueScore,
                100 - wellness.burnoutRisk,
            ],
            backgroundColor: `${stateColor}18`,
            borderColor: stateColor,
            borderWidth: 2,
            pointBackgroundColor: stateColor,
        }],
    };

    const radarOpts = {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: { legend: { display: false } },
        scales: {
            r: {
                min: 0, max: 100,
                grid: { color: "rgba(255,255,255,0.05)" },
                ticks: { color: "#4b5563", font: { size: 9 }, backdropColor: "transparent" },
                pointLabels: { color: "#6b7280", font: { size: 10 } },
                angleLines: { color: "rgba(255,255,255,0.04)" },
            },
        },
    };

    const dimData = {
        labels: ["Stress", "Fatigue", "Focus", "Energy", "Burnout Risk", "Recovery Need"],
        datasets: [{
            data: [
                wellness.stressScore, wellness.fatigueScore, wellness.focusScore,
                wellness.energyLevel, wellness.burnoutRisk, wellness.recoveryNeed,
            ],
            backgroundColor: [
                "#ef444430","#f59e0b30","#2dd4bf30",
                "#8b5cf630","#f9731630","#818cf830",
            ],
            borderColor: [
                "#ef4444","#f59e0b","#2dd4bf",
                "#8b5cf6","#f97316","#818cf8",
            ],
            borderWidth: 2, borderRadius: 6,
        }],
    };

    const barOpts = {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { color: "#6b7280", font: { size: 9 } } },
            y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#6b7280", font: { size: 9 } }, max: 100, beginAtZero: true },
        },
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    <span className="aura-gradient-text">Cognitive Analytics</span>
                </h1>
                    <p className="text-gray-500 text-sm mt-1">Deep insight into your mental performance patterns</p>
                    {demoMode && (
                        <p className="text-[11px] font-bold tracking-widest text-red-300 mt-2">DEMO DATA — NOT LIVE MEASUREMENTS</p>
                    )}
                </div>

            {/* Anomalies */}
            {deviations.length > 0 && (
                <div className="mb-5 space-y-2">
                    {deviations.map((d, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs"
                            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                            ! {d}
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Radar */}
                <AuraCard glow={stateColor} className="md:col-span-2 lg:col-span-1">
                    <AuraCardHeader label="Wellness Radar" icon="*" />
                    <div className="h-56">
                        <Radar data={radarData} options={radarOpts} />
                    </div>
                </AuraCard>

                {/* Dimension bars */}
                <AuraCard className="md:col-span-2">
                    <AuraCardHeader label="Dimension Breakdown" icon="*" />
                    <div className="h-48">
                        <Bar data={dimData} options={barOpts} />
                    </div>
                </AuraCard>

                {/* Session summary */}
                <AuraCard glow="#8b5cf6">
                    <AuraCardHeader label="Session Intelligence" icon="*" />
                    <div className="space-y-3">
                        {[
                            { l: "Overall Wellness", v: `${wellness.wellnessScore}/100`, c: scoreToColor(wellness.wellnessScore) },
                            { l: "Cognitive State", v: cognitiveState, c: stateColor },
                            { l: "Session Duration", v: `${sessionMins} min`, c: "#e8e8f0" },
                            { l: "Typing Baseline", v: `${Math.round(baseline.blinkRate)} blinks/min`, c: "#818cf8" },
                            { l: "Blink Baseline", v: `${Math.round(baseline.typingWPM)} WPM`, c: "#06b6d4" },
                            { l: "Cognitive Load", v: `${sensor.cognitiveLoad}% ${sensor.cognitiveLabel}`, c: "#a78bfa" },
                            { l: "Blink Rate", v: `${sensor.blinkRate}/min`, c: "#22d3ee" },
                            { l: "Sleep quality (dataset)", v: demoMode && currentRow && currentRow.sleep_quality != null ? currentRow.sleep_quality : "n/a", c: "#94a3b8" },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0">
                                <span className="text-gray-500">{s.l}</span>
                                <span className="font-semibold" style={{ color: s.c }}>{s.v}</span>
                            </div>
                        ))}
                    </div>
                </AuraCard>

                {/* Event log */}
                <AuraCard className="md:col-span-2 lg:col-span-2">
                    <AuraCardHeader label="Event Timeline" icon="*" />
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {eventLog.length === 0 ? (
                            <p className="text-xs text-gray-600 text-center py-6">No events logged yet - start the camera to begin.</p>
                        ) : eventLog.slice(0, 20).map((e) => (
                            <div key={e.id} className="flex items-center gap-2.5 text-[11px] py-1 border-b border-white/[0.03] last:border-0">
                                <span className="text-gray-600 font-mono">{new Date(e.timestamp).toLocaleTimeString()}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/10 text-indigo-400">{e.type}</span>
                                <span className="text-gray-400">{e.message}</span>
                            </div>
                        ))}
                    </div>
                </AuraCard>
            </div>
        </div>
    );
}

