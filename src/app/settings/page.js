
"use client";
import { useAura } from "@/context/AuraContext";
import { usePersonalization } from "@/context/PersonalizationContext";
import { useState } from "react";
import { motion } from "framer-motion";
import AuraCard, { AuraCardHeader } from "@/components/aura/AuraCard";
import { FEATURES } from "@/config/features";

export default function SettingsPage() {
    return <SettingsContent />;
}

function SettingsContent() {
    const { activeTheme, setActiveTheme } = useAura();
    const { baseline } = usePersonalization();

    const [features, setFeatures] = useState({ ...FEATURES });
    const [sensitivity, setSensitivity] = useState("medium");
    const [workStart, setWorkStart] = useState("09");
    const [workEnd, setWorkEnd] = useState("18");
    const [cleared, setCleared] = useState(false);

    const toggleFeature = (key) => {
        setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const clearData = () => {
        ["mindguard_hydration", "mindguard_sleep_log", "mindguard_movement",
         "mindguard_breathing", "aura_behavioral_baseline", "aura_daily_stress",
         "mindguard_sleep_skip"].forEach((k) => {
            try { localStorage.removeItem(k); } catch { }
        });
        setCleared(true);
        setTimeout(() => setCleared(false), 3000);
    };

    const themes = [
        { id: "void",   label: "Void",   desc: "Deep space darkness",      color: "#8b5cf6" },
        { id: "aurora", label: "Aurora", desc: "Bioluminescent teal glows", color: "#14b8a6" },
        { id: "solar",  label: "Solar",  desc: "Warm amber energy",         color: "#f59e0b" },
    ];

    const featureLabels = {
        hydrationReminders: { label: "Hydration Reminders", icon: "💧", desc: "Stress-adaptive water reminders" },
        movementPrompts:    { label: "Movement Prompts",    icon: "🏃", desc: "Guided desk-stretch breaks" },
        breathingGuide:     { label: "Breathing Guide",     icon: "🫁", desc: "4-7-8 stress intervention" },
        sleepTracker:       { label: "Sleep Tracker",       icon: "🌙", desc: "Daily sleep quality logging" },
        screenDistanceAlert:{ label: "Screen Distance Alert",icon: "👀", desc: "IPD-based distance warnings" },
    };

    return (
        <div className="page-container max-w-3xl">
            <div className="page-header">
                <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    <span className="aura-gradient-text">Settings</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">Personalize your AURA experience</p>
            </div>

            <div className="space-y-5">
                {/* Theme */}
                <AuraCard glow="#8b5cf6">
                    <AuraCardHeader label="Appearance" icon="🎨" />
                    <div className="grid grid-cols-3 gap-3">
                        {themes.map((t) => (
                            <button key={t.id} onClick={() => setActiveTheme(t.id)}
                                className="p-3 rounded-xl text-left transition-all"
                                style={{
                                    background: activeTheme === t.id ? `${t.color}15` : "transparent",
                                    border: `1px solid ${activeTheme === t.id ? t.color + "40" : "rgba(255,255,255,0.06)"}`,
                                }}>
                                <div className="w-4 h-4 rounded-full mb-2" style={{ background: t.color }} />
                                <div className="text-xs font-semibold text-white">{t.label}</div>
                                <div className="text-[10px] text-gray-500">{t.desc}</div>
                            </button>
                        ))}
                    </div>
                </AuraCard>

                {/* Health & Wellness features */}
                <AuraCard glow="#14b8a6">
                    <AuraCardHeader label="Health & Wellness Features" icon="💙" />
                    <div className="space-y-3">
                        {Object.entries(featureLabels).map(([key, f]) => (
                            <div key={key} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                                <div className="flex items-center gap-2.5">
                                    <span>{f.icon}</span>
                                    <div>
                                        <div className="text-xs font-medium text-gray-200">{f.label}</div>
                                        <div className="text-[10px] text-gray-500">{f.desc}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleFeature(key)}
                                    className="w-10 h-5 rounded-full transition-all relative"
                                    style={{ background: features[key] ? "#8b5cf6" : "rgba(255,255,255,0.1)" }}
                                >
                                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                                        style={{ left: features[key] ? "calc(100% - 18px)" : "2px" }} />
                                </button>
                            </div>
                        ))}
                    </div>
                </AuraCard>

                {/* AI Sensitivity */}
                <AuraCard>
                    <AuraCardHeader label="AI Sensitivity" icon="🧠" />
                    <p className="text-xs text-gray-500 mb-4">Controls how aggressively AURA intervenes with recommendations.</p>
                    <div className="grid grid-cols-3 gap-2">
                        {["low", "medium", "high"].map((s) => (
                            <button key={s} onClick={() => setSensitivity(s)}
                                className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                                style={{
                                    background: sensitivity === s ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.03)",
                                    color: sensitivity === s ? "#a78bfa" : "#6b7280",
                                    border: `1px solid ${sensitivity === s ? "rgba(139,92,246,0.3)" : "transparent"}`,
                                }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </AuraCard>

                {/* Behavioral data */}
                <AuraCard>
                    <AuraCardHeader label="Your Learned Baseline" icon="📊" />
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                            { l: "Blink Rate", v: `${Math.round(baseline.blinkRate)}/min` },
                            { l: "Typing Speed", v: `${Math.round(baseline.typingWPM)} WPM` },
                            { l: "Sessions Sampled", v: baseline.sampleCount },
                            { l: "Avg Stress", v: `${Math.round(baseline.stressLevel)}/100` },
                        ].map((m, i) => (
                            <div key={i} className="bg-white/[0.025] rounded-xl p-2.5 text-center">
                                <div className="text-base font-bold text-indigo-400">{m.v}</div>
                                <div className="text-[9px] text-gray-600 mt-0.5">{m.l}</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={clearData}
                        className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{ background: "rgba(239,68,68,0.08)", color: cleared ? "#22c55e" : "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}>
                        {cleared ? "✓ Data cleared" : "🗑 Reset All Behavioral Data"}
                    </button>
                </AuraCard>

                {/* Privacy */}
                <AuraCard glow="#2dd4bf">
                    <AuraCardHeader label="Privacy & Data" icon="🔒" />
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> All sensor data processed locally in your browser</div>
                        <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> No data transmitted to external servers</div>
                        <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Camera feed never stored or uploaded</div>
                        <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Behavioral data encrypted in localStorage</div>
                        <div className="flex items-center gap-2"><span className="text-amber-400">ℹ</span> AURA insights are assistive, not medical diagnosis</div>
                    </div>
                </AuraCard>
            </div>
        </div>
    );
}
