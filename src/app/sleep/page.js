"use client";
import AuraCard, { AuraCardHeader } from "@/components/aura/AuraCard";
import { useDataset } from "@/context/DatasetContext";
import SleepTracker from "@/components/health/SleepTracker";
import SleepCorrelationChart from "@/components/health/SleepCorrelationChart";
import { useAura } from "@/context/AuraContext";
import { motion } from "framer-motion";

export default function SleepPage() {
    return <SleepContent />;
}

function SleepContent() {
    const { wellness, stateColor } = useAura();
    const { demoMode, currentRow } = useDataset();

    const tips = [
        { icon: "📵", tip: "Stop screens 45 minutes before bed", science: "Blue light suppresses melatonin production" },
        { icon: "🌡️", tip: "Keep bedroom at 65-68°F (18-20°C)", science: "Core temperature drop triggers sleep onset" },
        { icon: "🫁", tip: "Do 3 cycles of 4-7-8 breathing before sleep", science: "Activates parasympathetic nervous system" },
        { icon: "☕", tip: "No caffeine after 2 PM", science: "Caffeine has a 5-hour half-life" },
        { icon: "⏰", tip: "Wake at the same time every day", science: "Anchors your circadian rhythm" },
        { icon: "🌙", tip: "Keep your bedroom dark", science: "Light signals the brain to reduce melatonin" },
    ];

    const stressImpact = wellness.stressScore > 60
        ? "High stress is likely to reduce sleep quality tonight. Try the breathing guide before bed."
        : wellness.stressScore > 35
        ? "Moderate stress may affect sleep onset. A short wind-down routine will help."
        : "Your stress levels suggest good conditions for quality sleep tonight.";

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    <span className="aura-gradient-text">Sleep Intelligence</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">Correlating sleep quality with cognitive performance</p>
                {demoMode && (
                    <p className="text-[11px] font-bold tracking-widest text-red-300 mt-2">
                        DEMO DATA — NOT LIVE MEASUREMENTS
                        {currentRow && currentRow.sleep_quality != null ? ` · dataset sleep_quality ${currentRow.sleep_quality}` : ""}
                    </p>
                )}
            </div>

            {/* Log today's sleep */}
            <SleepTracker />

            {/* Tonight&apos;s Prediction */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-4 rounded-2xl flex items-center gap-4"
                style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <span className="text-2xl">🌙</span>
                <div>
                    <div className="text-xs font-bold text-purple-400 mb-0.5">Tonight&apos;s Prediction</div>
                    <p className="text-xs text-gray-400">{stressImpact}</p>
                </div>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-5 mb-5">
                {/* Correlation chart */}
                <div className="md:col-span-2">
                    <SleepCorrelationChart />
                </div>

                {/* Sleep tips */}
                <AuraCard glow="#a78bfa">
                    <AuraCardHeader label="Sleep Optimization" icon="✨" />
                    <div className="space-y-3">
                        {tips.map((t, i) => (
                            <div key={i} className="flex items-start gap-3 text-xs border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
                                <span className="text-base shrink-0">{t.icon}</span>
                                <div>
                                    <div className="text-gray-200 font-medium">{t.tip}</div>
                                    <div className="text-gray-500 mt-0.5 italic">{t.science}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </AuraCard>

                {/* Wellness → sleep link */}
                <AuraCard glow="#06b6d4">
                    <AuraCardHeader label="Today's Wellness Impact" icon="🔗" />
                    <div className="space-y-4">
                        {[
                            { l: "Current Stress", v: wellness.stressScore, inv: true, note: wellness.stressScore > 60 ? "High — may delay sleep onset" : "Manageable — good sleep conditions" },
                            { l: "Fatigue Score", v: wellness.fatigueScore, inv: true, note: wellness.fatigueScore > 60 ? "High fatigue — earlier bedtime recommended" : "Normal fatigue accumulation" },
                            { l: "Energy Level", v: wellness.energyLevel, inv: false, note: wellness.energyLevel > 50 ? "Good energy — avoid screens to preserve sleep pressure" : "Low energy — your body needs rest" },
                        ].map((m, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] text-gray-500">{m.l}</span>
                                    <span className="text-[11px] text-white font-medium">{m.v}/100</span>
                                </div>
                                <div className="stress-meter mb-1">
                                    <div className="stress-meter-fill" style={{
                                        width: `${m.v}%`,
                                        background: m.inv
                                            ? `linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)`
                                            : `linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)`,
                                    }} />
                                </div>
                                <p className="text-[10px] text-gray-500 italic">{m.note}</p>
                            </div>
                        ))}
                    </div>
                </AuraCard>
            </div>
        </div>
    );
}

