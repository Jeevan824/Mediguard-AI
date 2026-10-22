"use client";
import { useAura } from "@/context/AuraContext";
import { useDataset } from "@/context/DatasetContext";
import { useHealth } from "@/context/HealthContext";
import { motion } from "framer-motion";
import AuraCard, { AuraCardHeader } from "@/components/aura/AuraCard";
import { scoreToColor } from "@/config/auraTheme";
import Link from "next/link";

export default function RecoveryPage() {
    return <RecoveryContent />;
}

function RecoveryContent() {
    const { wellness, cognitiveState, stateColor, logEvent } = useAura();
    const { triggerBreathing } = useHealth();
    const { demoMode } = useDataset();

    const recoveryUrgency = wellness.recoveryNeed;
    const urgencyLabel = recoveryUrgency > 70 ? "High Urgency" : recoveryUrgency > 40 ? "Moderate" : "Low Priority";
    const urgencyColor = recoveryUrgency > 70 ? "#ef4444" : recoveryUrgency > 40 ? "#f59e0b" : "#2dd4bf";

    const recoveryActions = [
        {
            icon: "🫁",
            title: "4-7-8 Breathing",
            desc: "57-second guided breathing exercise. Proven to reduce cortisol within minutes.",
            impact: "High",
            time: "1 min",
            color: "#14b8a6",
            action: () => { triggerBreathing(); logEvent("recovery", "Breathing guide triggered from recovery page"); },
        },
        {
            icon: "💧",
            title: "Hydration Break",
            desc: "Drink 200-250ml of water. Even 1% dehydration reduces cognitive performance by 10%.",
            impact: "Medium",
            time: "2 min",
            color: "#06b6d4",
            action: null,
        },
        {
            icon: "🚶",
            title: "Movement Break",
            desc: "2 minutes of guided desk stretches. Reduces cortisol, improves blood flow to the brain.",
            impact: "High",
            time: "2 min",
            color: "#8b5cf6",
            action: null,
        },
        {
            icon: "🌑",
            title: "Eye Recovery",
            desc: "Cover eyes with warm palms for 60 seconds. Resets eye muscles and reduces strain.",
            impact: "Medium",
            time: "1 min",
            color: "#a78bfa",
            action: null,
        },
        {
            icon: "📵",
            title: "Digital Detox",
            desc: "10-minute complete screen break. Step away, look at something distant, breathe.",
            impact: "Very High",
            time: "10 min",
            color: "#2dd4bf",
            action: null,
        },
        {
            icon: "📋",
            title: "Task Simplification",
            desc: "Break your next task into 3 micro-steps. Reduces cognitive overhead and decision fatigue.",
            impact: "Medium",
            time: "3 min",
            color: "#818cf8",
            action: null,
        },
    ];

    // Sort by urgency relevance
    const sorted = recoveryUrgency > 60
        ? recoveryActions
        : [...recoveryActions].sort((a, b) => (b.impact === "High" ? 1 : -1));

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    <span className="aura-gradient-text">Recovery Intelligence</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">AI-personalized recovery recommendations based on your current state</p>
                {demoMode && (
                    <p className="text-[11px] font-bold tracking-widest text-red-300 mt-2">DEMO DATA — NOT LIVE MEASUREMENTS</p>
                )}
            </div>

            {/* Recovery urgency banner */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl flex items-center gap-4"
                style={{ background: `${urgencyColor}10`, border: `1px solid ${urgencyColor}25` }}
            >
                <div className="text-3xl">
                    {recoveryUrgency > 70 ? "🚨" : recoveryUrgency > 40 ? "⚠️" : "✅"}
                </div>
                <div>
                    <div className="text-sm font-bold" style={{ color: urgencyColor }}>
                        Recovery Need: {urgencyLabel} ({recoveryUrgency}/100)
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                        Current state: <span style={{ color: stateColor }}>{cognitiveState}</span> ·{" "}
                        Wellness: <span className="text-white font-semibold">{wellness.wellnessScore}/100</span>
                    </div>
                </div>
                <div className="ml-auto">
                    <div className="stress-meter w-32">
                        <div className="stress-meter-fill" style={{
                            width: `${recoveryUrgency}%`,
                            background: `linear-gradient(90deg, ${urgencyColor}80, ${urgencyColor})`,
                        }} />
                    </div>
                </div>
            </motion.div>

            {/* Recovery cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {sorted.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <AuraCard glow={r.color} hover padding="p-5" className="h-full flex flex-col">
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-2xl">{r.icon}</span>
                                <div className="flex gap-1.5">
                                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${r.color}15`, color: r.color }}>
                                        {r.time}
                                    </span>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{
                                        background: r.impact === "Very High" ? "#ef444415" : r.impact === "High" ? "#f59e0b15" : "#818cf815",
                                        color: r.impact === "Very High" ? "#ef4444" : r.impact === "High" ? "#f59e0b" : "#818cf8",
                                    }}>
                                        {r.impact}
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-sm font-bold mb-1.5" style={{ color: r.color }}>{r.title}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed flex-1">{r.desc}</p>
                            {r.action && (
                                <button
                                    onClick={r.action}
                                    className="mt-4 w-full py-2 text-xs font-semibold rounded-xl transition-all"
                                    style={{ background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}25` }}
                                >
                                    Start Now →
                                </button>
                            )}
                        </AuraCard>
                    </motion.div>
                ))}
            </div>

            {/* Link to assistant */}
            <AuraCard glow="#a78bfa" padding="p-5">
                <div className="flex items-center gap-4">
                    <div className="text-3xl">🤖</div>
                    <div>
                        <h3 className="text-sm font-bold text-purple-400 mb-0.5">Need personalized guidance?</h3>
                        <p className="text-xs text-gray-400">Talk to AURA — your AI wellness companion will create a customized recovery plan based on your exact metrics.</p>
                    </div>
                    <Link href="/assistant" className="ml-auto shrink-0">
                        <button className="btn-secondary text-xs py-2 px-4">Talk to AURA →</button>
                    </Link>
                </div>
            </AuraCard>
        </div>
    );
}
