"use client";
import { useAura } from "@/context/AuraContext";
import { useDataset } from "@/context/DatasetContext";
import { usePersonalization } from "@/context/PersonalizationContext";
import { useSensor } from "@/context/SensorContext";
import { useHealth } from "@/context/HealthContext";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import AuraCard, { AuraCardHeader } from "@/components/aura/AuraCard";
import { predictBurnout, gatherBurnoutFeatures } from "@/lib/burnoutPredictor";
import { scoreToColor } from "@/config/auraTheme";

export default function BurnoutPage() {
    return <BurnoutContent />;
}

function BurnoutContent() {
    const { wellness } = useAura();
    const { burnoutRisk7d } = usePersonalization();
    const sensor = useSensor();
    const { movementBreaks } = useHealth();
    const { demoMode, currentRow } = useDataset();

    const [sessionMins, setSessionMins] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setSessionMins((Date.now() - sensor.sessionStart) / 60000), 1000);
        return () => clearInterval(t);
    }, [sensor.sessionStart]);

    const prediction = useMemo(() => {
        if (demoMode && currentRow) {
            const probability = Number(currentRow.burnout_risk) || 0;
            let tier = "Minimal";
            if (probability >= 80) tier = "Critical";
            else if (probability >= 60) tier = "High";
            else if (probability >= 40) tier = "Moderate";
            else if (probability >= 20) tier = "Low";
            return {
                probability,
                tier,
                confidence: 100,
                riskFactors: ["Example dataset record — not a live 7-day prediction"],
                protective: [],
            };
        }
        return predictBurnout(gatherBurnoutFeatures(sensor.stressLevel, sessionMins, movementBreaks, sensor.overloadEvents));
    }, [demoMode, currentRow, sensor.stressLevel, sessionMins, movementBreaks, sensor.overloadEvents]);

    const tierColors = { Minimal: "#2dd4bf", Low: "#818cf8", Moderate: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
    const tierColor = tierColors[prediction.tier] || "#818cf8";

    const circumference = 2 * Math.PI * 80;
    const dashOffset = circumference * (1 - prediction.probability / 100);

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    <span className="aura-gradient-text">Burnout Prediction</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">7-day behavioral risk model  -  Updated in real time</p>
                {demoMode && (
                    <p className="text-[11px] font-bold tracking-widest text-red-300 mt-2">DEMO DATA — NOT LIVE MEASUREMENTS</p>
                )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Main gauge */}
                <AuraCard glow={tierColor} className="lg:col-span-1 flex flex-col items-center py-8">
                    <AuraCardHeader label="Burnout Probability" icon="*" />
                    <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
                        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                        <circle
                            cx="100" cy="100" r="80" fill="none"
                            stroke={tierColor} strokeWidth="12" strokeLinecap="round"
                            strokeDasharray={circumference} strokeDashoffset={dashOffset}
                            style={{ transition: "stroke-dashoffset 1.5s ease, stroke 0.5s ease" }}
                        />
                    </svg>
                    <div className="text-center -mt-28">
                        <div className="text-5xl font-bold" style={{ color: tierColor, fontFamily: "'Outfit',sans-serif" }}>
                            {prediction.probability}%
                        </div>
                        <div className="text-sm font-semibold mt-1" style={{ color: tierColor }}>{prediction.tier} Risk</div>
                        <div className="text-[10px] text-gray-500 mt-1">Confidence: {prediction.confidence}%</div>
                    </div>
                </AuraCard>

                {/* Risk factors */}
                <AuraCard className="lg:col-span-1">
                    <AuraCardHeader label="Risk Factors" icon="*" />
                    {prediction.riskFactors.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-8">No significant risk factors detected.</p>
                    ) : (
                        <div className="space-y-2">
                            {prediction.riskFactors.map((r, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                    className="flex items-start gap-2 text-xs py-2 border-b border-white/[0.04] last:border-0">
                                    <span className="text-red-400 mt-0.5 shrink-0">^</span>
                                    <span className="text-gray-300">{r}</span>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AuraCard>

                {/* Protective factors */}
                <AuraCard className="lg:col-span-1">
                    <AuraCardHeader label="Protective Factors" icon="*" />
                    {prediction.protective.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-8">Build healthy habits to add protective factors.</p>
                    ) : (
                        <div className="space-y-2">
                            {prediction.protective.map((p, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs py-2 border-b border-white/[0.04] last:border-0">
                                    <span className="text-emerald-400 mt-0.5 shrink-0"></span>
                                    <span className="text-gray-300">{p}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </AuraCard>

                {/* Prevention plan */}
                <AuraCard className="lg:col-span-3">
                    <AuraCardHeader label="AI Prevention Plan" icon="*" />
                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            { t: "Immediate Actions", color: "#ef4444", items: ["Take a 10-minute walk now", "Drink water", "Do 3 breathing cycles", "Close non-essential tabs"] },
                            { t: "This Week", color: "#f59e0b", items: ["Cap sessions at 90 minutes", "Log sleep every morning", "Take movement breaks every hour", "Protect one deep-focus block daily"] },
                            { t: "Long Term", color: "#2dd4bf", items: ["Build consistent sleep schedule", "Practice daily stress monitoring", "Identify high-stress tasks early", "Review burnout risk weekly"] },
                        ].map((plan, i) => (
                            <div key={i} className="rounded-xl p-4" style={{ background: `${plan.color}08`, border: `1px solid ${plan.color}20` }}>
                                <h4 className="text-xs font-bold mb-3" style={{ color: plan.color }}>{plan.t}</h4>
                                <ul className="space-y-1.5">
                                    {plan.items.map((item, j) => (
                                        <li key={j} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                                            <span style={{ color: plan.color }}></span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </AuraCard>
            </div>
        </div>
    );
}

