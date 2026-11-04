"use client";
import { useAura } from "@/context/AuraContext";
import { useDataset } from "@/context/DatasetContext";
import { usePersonalization } from "@/context/PersonalizationContext";
import { useSensor } from "@/context/SensorContext";
import { useHealth } from "@/context/HealthContext";
import { useMemo, useState, useEffect } from "react";
import { predictBurnout, gatherBurnoutFeatures } from "@/lib/burnoutPredictor";
import { scoreToColor } from "@/config/auraTheme";

export default function BurnoutPage() { return <BurnoutContent />; }

const T = {
    bg: "#0d1117", surface: "#161b22", border: "#21262d", border2: "#30363d",
    text: "#e6edf3", textMid: "#8b949e", textDim: "#484f58",
    amber: "#e6a817", ok: "#3fb950", warn: "#d29922", crit: "#da3633",
    blue: "#388bfd", purple: "#bc8cff",
    mono: "'JetBrains Mono','Courier New',monospace",
    sans: "'Inter',system-ui,sans-serif",
};

function Card({ children, style = {} }) {
    return (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", ...style }}>
            {children}
        </div>
    );
}
function CardHeader({ label, right }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: T.bg }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.amber }}>{label}</span>
            {right}
        </div>
    );
}

const TIER_COLORS = { Minimal: "#3fb950", Low: "#388bfd", Moderate: "#d29922", High: "#e6a817", Critical: "#da3633" };

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
            return { probability, tier, confidence: 100, riskFactors: ["Example dataset record — not a live 7-day prediction"], protective: [] };
        }
        return predictBurnout(gatherBurnoutFeatures(sensor.stressLevel, sessionMins, movementBreaks, sensor.overloadEvents));
    }, [demoMode, currentRow, sensor.stressLevel, sessionMins, movementBreaks, sensor.overloadEvents]);

    const tierColor = TIER_COLORS[prediction.tier] || T.blue;
    const circumference = 2 * Math.PI * 80;
    const dashOffset = circumference * (1 - prediction.probability / 100);

    const PLAN = [
        {
            t: "Immediate Actions", color: T.crit,
            items: ["Take a 10-minute walk now", "Drink a full glass of water", "Do 3 deep breathing cycles", "Close non-essential browser tabs"],
        },
        {
            t: "This Week", color: T.warn,
            items: ["Cap work sessions at 90 minutes", "Log your sleep every morning", "Take movement break every hour", "Protect one deep-focus block daily"],
        },
        {
            t: "Long Term", color: T.ok,
            items: ["Build consistent sleep schedule", "Practice daily stress monitoring", "Identify high-stress tasks early", "Review burnout risk score weekly"],
        },
    ];

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
                    <h1 style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 900, color: T.text, letterSpacing: "-0.02em" }}>
                        Burnout <span style={{ color: T.amber }}>Prediction</span>
                    </h1>
                    <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        / 7d_risk_model
                    </span>
                </div>
                <p style={{ color: T.textMid, fontSize: 13 }}>
                    7-day behavioral risk model · updated every second
                </p>
                {demoMode && (
                    <div style={{
                        marginTop: 10, padding: "4px 12px",
                        background: "rgba(218,54,51,0.1)", border: "1px solid rgba(218,54,51,0.3)",
                        borderRadius: 4, display: "inline-block",
                        fontFamily: T.mono, fontSize: 10, color: T.crit, letterSpacing: "0.1em",
                    }}>
                        ⚠ DEMO DATA — NOT LIVE MEASUREMENTS
                    </div>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 1fr", gap: 14, marginBottom: 14 }}>

                {/* ── Main gauge ── */}
                <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", borderTop: `3px solid ${tierColor}` }}>
                    <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.amber, marginBottom: 20 }}>
                        Burnout Probability
                    </div>
                    <div style={{ position: "relative" }}>
                        <svg width={200} height={200} viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx={100} cy={100} r={80} fill="none" stroke={T.border} strokeWidth={10} />
                            <circle cx={100} cy={100} r={80} fill="none"
                                stroke={tierColor} strokeWidth={10} strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                style={{ transition: "stroke-dashoffset 1.5s ease, stroke 0.5s ease" }}
                            />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                            <div style={{ fontFamily: T.mono, fontSize: 40, fontWeight: 900, color: tierColor, lineHeight: 1 }}>
                                {prediction.probability}%
                            </div>
                            <div style={{ fontFamily: T.mono, fontSize: 12, color: tierColor, fontWeight: 700, marginTop: 4 }}>
                                {prediction.tier} Risk
                            </div>
                            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, marginTop: 2 }}>
                                conf: {prediction.confidence}%
                            </div>
                        </div>
                    </div>
                    {/* Tier legend */}
                    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
                        {Object.entries(TIER_COLORS).map(([tier, color]) => (
                            <div key={tier} style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "5px 10px",
                                background: prediction.tier === tier ? color + "14" : "transparent",
                                border: `1px solid ${prediction.tier === tier ? color + "40" : T.border}`,
                                borderRadius: 4,
                            }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: prediction.tier === tier ? `0 0 8px ${color}` : "none" }} />
                                <span style={{ fontFamily: T.mono, fontSize: 10, color: prediction.tier === tier ? color : T.textDim, fontWeight: prediction.tier === tier ? 700 : 400 }}>
                                    {tier}
                                </span>
                                {prediction.tier === tier && (
                                    <span style={{ marginLeft: "auto", fontFamily: T.mono, fontSize: 9, color, fontWeight: 700 }}>← CURRENT</span>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>

                {/* ── Risk factors ── */}
                <Card>
                    <CardHeader label="Risk Factors" right={<span style={{ fontFamily: T.mono, fontSize: 10, color: T.crit }}>{prediction.riskFactors.length} detected</span>} />
                    {prediction.riskFactors.length === 0 ? (
                        <div style={{ padding: "40px 16px", textAlign: "center", color: T.textDim, fontSize: 12, fontFamily: T.mono }}>
                            — no significant risk factors —
                        </div>
                    ) : (
                        <div>
                            {prediction.riskFactors.map((r, i) => (
                                <div key={i} style={{
                                    display: "flex", alignItems: "flex-start", gap: 10,
                                    padding: "9px 14px", borderBottom: `1px solid ${T.border}`,
                                    fontSize: 12,
                                }}>
                                    <span style={{ color: T.crit, fontFamily: T.mono, flexShrink: 0 }}>▲</span>
                                    <span style={{ color: T.textMid }}>{r}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* ── Protective factors ── */}
                <Card>
                    <CardHeader label="Protective Factors" right={<span style={{ fontFamily: T.mono, fontSize: 10, color: T.ok }}>{prediction.protective.length} active</span>} />
                    {prediction.protective.length === 0 ? (
                        <div style={{ padding: "40px 16px", textAlign: "center", color: T.textDim, fontSize: 12, fontFamily: T.mono }}>
                            — build healthy habits to add protective factors —
                        </div>
                    ) : (
                        <div>
                            {prediction.protective.map((p, i) => (
                                <div key={i} style={{
                                    display: "flex", alignItems: "flex-start", gap: 10,
                                    padding: "9px 14px", borderBottom: `1px solid ${T.border}`,
                                    fontSize: 12,
                                }}>
                                    <span style={{ color: T.ok, fontFamily: T.mono, flexShrink: 0 }}>✓</span>
                                    <span style={{ color: T.textMid }}>{p}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* ── Prevention plan ── */}
            <Card>
                <CardHeader label="AI Prevention Plan" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
                    {PLAN.map((plan, i) => (
                        <div key={i} style={{
                            padding: "20px",
                            borderRight: i < 2 ? `1px solid ${T.border}` : "none",
                            borderTop: `3px solid ${plan.color}`,
                        }}>
                            <div style={{
                                fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                                letterSpacing: "0.1em", textTransform: "uppercase",
                                color: plan.color, marginBottom: 14,
                            }}>{plan.t}</div>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                                {plan.items.map((item, j) => (
                                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: T.textMid }}>
                                        <span style={{ color: plan.color, flexShrink: 0, marginTop: 1 }}>›</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Card>

            {/* ── Live metrics strip ── */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
                {[
                    { l: "Stress",   v: `${wellness.stressScore}%`,              c: scoreToColor(100 - wellness.stressScore) },
                    { l: "Fatigue",  v: `${wellness.fatigueScore}%`,             c: scoreToColor(100 - wellness.fatigueScore) },
                    { l: "Burnout",  v: `${wellness.burnoutRisk}%`,              c: scoreToColor(100 - wellness.burnoutRisk) },
                    { l: "Focus",    v: `${wellness.focusScore}%`,               c: scoreToColor(wellness.focusScore) },
                    { l: "Energy",   v: `${wellness.energyLevel}%`,              c: scoreToColor(wellness.energyLevel) },
                    { l: "Recovery", v: `${wellness.recoveryNeed}% needed`,      c: scoreToColor(100 - wellness.recoveryNeed) },
                ].map((m, i) => (
                    <div key={i} style={{
                        padding: "14px 12px", textAlign: "center",
                        background: i % 2 === 0 ? T.surface : "#1a2030",
                        borderRight: i < 5 ? `1px solid ${T.border}` : "none",
                    }}>
                        <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 900, color: m.c, lineHeight: 1 }}>{m.v}</div>
                        <div style={{ fontSize: 9, color: T.textDim, marginTop: 4, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: T.mono }}>{m.l}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
