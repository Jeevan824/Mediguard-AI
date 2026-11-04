"use client";
import Link from "next/link";
import { useAura } from "@/context/AuraContext";

const MODULES = [
    { href: "/dashboard",     icon: "▦", label: "Live Dashboard",  desc: "Real-time cognitive load, EAR & blink tracking" },
    { href: "/driver-safety", icon: "◎", label: "Driver Safety",   desc: "Drowsiness detection with audio alerts" },
    { href: "/analytics",     icon: "∿", label: "Analytics",       desc: "Radar charts, event logs, session intelligence" },
    { href: "/focus",         icon: "◈", label: "Focus Session",   desc: "AI-monitored Pomodoro with fatigue scoring" },
    { href: "/burnout",       icon: "⚡", label: "Burnout Risk",   desc: "7-day behavioral burnout prediction model" },
    { href: "/recovery",      icon: "◑", label: "Recovery",        desc: "Personalized recovery plans & tracking" },
    { href: "/sleep",         icon: "☽", label: "Sleep Intel",     desc: "Sleep correlation with cognitive performance" },
    { href: "/assistant",     icon: "✦", label: "AI Assistant",    desc: "Empathetic wellness coaching chatbot" },
    { href: "/powerbi",       icon: "▤", label: "Power BI",        desc: "Historical analytics & trend dashboards" },
    { href: "/settings",      icon: "⚙", label: "Settings",        desc: "Calibration, features & user preferences" },
];

const STATS = [
    { value: "7",   label: "Signals tracked",   unit: "" },
    { value: "94",  label: "Detection accuracy", unit: "%" },
    { value: "<1",  label: "Response latency",  unit: "s" },
    { value: "100", label: "Local processing",  unit: "%" },
];

const S = {
    bg:       "#0d1117",
    surface:  "#161b22",
    border:   "#21262d",
    border2:  "#30363d",
    text:     "#e6edf3",
    textMid:  "#8b949e",
    textDim:  "#484f58",
    amber:    "#e6a817",
    amberDim: "rgba(230,168,23,0.09)",
    amberBdr: "rgba(230,168,23,0.22)",
    ok:       "#3fb950",
    crit:     "#da3633",
    mono:     "'JetBrains Mono','Courier New',monospace",
    sans:     "'Inter',system-ui,sans-serif",
};

export default function LandingPage() {
    const { cognitiveState, stateColor, wellness } = useAura();

    return (
        <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.sans }}>

            {/* ── Hero ─────────────────────────────────────────────────────────── */}
            <section style={{
                minHeight: "100vh",
                display:   "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "100px 24px 60px",
                position: "relative",
                overflow: "hidden",
            }}>
                {/* Subtle grid backdrop */}
                <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    backgroundImage: `
                        linear-gradient(rgba(230,168,23,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(230,168,23,0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px",
                }} />

                {/* Status chip */}
                <div style={{
                    display:      "inline-flex",
                    alignItems:   "center",
                    gap:          8,
                    padding:      "5px 14px",
                    borderRadius: 4,
                    border:       `1px solid ${S.amberBdr}`,
                    background:   S.amberDim,
                    marginBottom: 32,
                    fontFamily:   S.mono,
                    fontSize:     11,
                    fontWeight:   700,
                    letterSpacing: "0.1em",
                    color:        S.amber,
                }}>
                    <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: S.ok,
                        boxShadow: `0 0 8px ${S.ok}`,
                        animation: "orb-pulse 2s ease-in-out infinite",
                        display: "inline-block",
                    }} />
                    SYSTEM ONLINE · COGNITIVE MONITORING ACTIVE
                </div>

                {/* Wordmark */}
                <h1 style={{
                    fontFamily:   S.mono,
                    fontSize:     "clamp(52px, 8vw, 96px)",
                    fontWeight:   900,
                    lineHeight:   1,
                    marginBottom: 8,
                    letterSpacing: "-0.04em",
                }}>
                    <span className="aura-gradient-text">MIND</span>
                    <span style={{ color: S.border2, fontWeight: 300 }}>GUARD</span>
                </h1>
                <div style={{
                    fontFamily:    S.mono,
                    fontSize:      12,
                    letterSpacing: "0.35em",
                    color:         S.textMid,
                    marginBottom:  24,
                    textTransform: "uppercase",
                }}>
                    Cognitive Wellness Intelligence System
                </div>

                <p style={{
                    maxWidth:     540,
                    margin:       "0 auto 40px",
                    lineHeight:   1.75,
                    color:        S.textMid,
                    fontSize:     15,
                }}>
                    A real-time behavioral monitoring platform that tracks eyes, posture,
                    mouse activity and typing patterns to detect fatigue, predict burnout,
                    and guide intelligent recovery — entirely in your browser.
                </p>

                {/* CTAs */}
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
                    <Link href="/dashboard">
                        <button className="btn-primary">
                            ▶ Open Live Dashboard
                        </button>
                    </Link>
                    <Link href="/driver-safety">
                        <button className="btn-secondary">
                            ◎ Driver Safety Monitor
                        </button>
                    </Link>
                </div>

                {/* Stats strip */}
                <div style={{
                    display:         "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap:             1,
                    maxWidth:        640,
                    width:           "100%",
                    margin:          "0 auto",
                    border:          `1px solid ${S.border}`,
                    borderRadius:    6,
                    overflow:        "hidden",
                }}>
                    {STATS.map((s, i) => (
                        <div key={i} style={{
                            padding:    "18px 12px",
                            background: i % 2 === 0 ? S.surface : "#1a2030",
                            textAlign:  "center",
                            borderRight: i < 3 ? `1px solid ${S.border}` : "none",
                        }}>
                            <div style={{
                                fontFamily:  S.mono,
                                fontSize:    26,
                                fontWeight:  900,
                                color:       S.amber,
                                lineHeight:  1,
                            }}>{s.value}{s.unit}</div>
                            <div style={{ fontSize: 10, color: S.textMid, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Module grid ─────────────────────────────────────────────────── */}
            <section style={{ padding: "60px 24px", borderTop: `1px solid ${S.border}` }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <div style={{ marginBottom: 36, display: "flex", alignItems: "baseline", gap: 12 }}>
                        <h2 style={{
                            fontFamily:    S.mono,
                            fontSize:      13,
                            fontWeight:    700,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color:         S.amber,
                        }}>10 Intelligent Modules</h2>
                        <div style={{ flex: 1, height: 1, background: S.border }} />
                    </div>

                    <div style={{
                        display:             "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                        gap:                 1,
                        border:              `1px solid ${S.border}`,
                        borderRadius:        8,
                        overflow:            "hidden",
                    }}>
                        {MODULES.map((m, i) => (
                            <Link key={m.href} href={m.href} style={{ textDecoration: "none" }}>
                                <div style={{
                                    padding:      "20px 18px",
                                    background:   S.surface,
                                    borderRight:  `1px solid ${S.border}`,
                                    borderBottom: `1px solid ${S.border}`,
                                    cursor:       "pointer",
                                    transition:   "background 0.15s",
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#1c2330"}
                                    onMouseLeave={e => e.currentTarget.style.background = S.surface}
                                >
                                    <div style={{
                                        fontFamily: S.mono,
                                        fontSize:   20,
                                        color:      S.amber,
                                        marginBottom: 8,
                                    }}>{m.icon}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 4 }}>
                                        {m.label}
                                    </div>
                                    <div style={{ fontSize: 11, color: S.textMid, lineHeight: 1.5 }}>
                                        {m.desc}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Feature highlights ─────────────────────────────────────────── */}
            <section style={{ padding: "60px 24px", borderTop: `1px solid ${S.border}` }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <div style={{ marginBottom: 36, display: "flex", alignItems: "baseline", gap: 12 }}>
                        <h2 style={{
                            fontFamily:    S.mono,
                            fontSize:      13,
                            fontWeight:    700,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color:         S.amber,
                        }}>Technology Stack</h2>
                        <div style={{ flex: 1, height: 1, background: S.border }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                        {[
                            { label: "Multi-modal State Engine",  color: S.amber,    desc: "Combines face landmarks, blink rate, typing WPM, mouse jerkiness, and head pose yaw into a unified fatigue score." },
                            { label: "Burnout Prediction Model",  color: "#da3633",  desc: "Behavioral history analyzed over 7-day window. Produces tier-based risk score: Minimal → Low → Moderate → High → Critical." },
                            { label: "Real-time EAR Tracking",    color: S.ok,       desc: "Eye Aspect Ratio computed from 468-point MediaPipe face mesh. Blink detection calibrated per user over first 30 seconds." },
                            { label: "Head Pose Estimation",      color: "#388bfd",  desc: "Yaw and pitch estimation via landmark geometry. Distraction detected when head turns beyond configurable threshold." },
                            { label: "Driver Safety TTS Alerts",  color: "#d29922",  desc: "Priority-queued text-to-speech engine fires contextual voice alerts for drowsiness, yawning, and eye closure events." },
                            { label: "Privacy by Design",         color: "#bc8cff",  desc: "All video frames processed client-side via WebAssembly. No pixel data leaves the device. Sessions stored in localStorage." },
                        ].map((f, i) => (
                            <div key={i} style={{
                                padding:      "20px",
                                background:   S.surface,
                                border:       `1px solid ${S.border}`,
                                borderTop:    `3px solid ${f.color}`,
                                borderRadius: 6,
                            }}>
                                <div style={{
                                    fontFamily:    S.mono,
                                    fontSize:      11,
                                    fontWeight:    700,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    color:         f.color,
                                    marginBottom:  10,
                                }}>{f.label}</div>
                                <p style={{ fontSize: 12, color: S.textMid, lineHeight: 1.65 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Live status strip ───────────────────────────────────────────── */}
            <section style={{
                padding:     "24px",
                background:  S.surface,
                borderTop:   `1px solid ${S.border}`,
                borderBottom: `1px solid ${S.border}`,
            }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                    <div style={{ fontFamily: S.mono, fontSize: 10, color: S.textMid, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Live State
                    </div>
                    <div style={{
                        fontFamily: S.mono, fontSize: 12, fontWeight: 700,
                        color: stateColor || S.amber,
                        padding: "3px 10px",
                        border: `1px solid ${(stateColor || S.amber) + "40"}`,
                        borderRadius: 3,
                        background: (stateColor || S.amber) + "12",
                    }}>
                        {cognitiveState || "INITIALIZING"}
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {[
                            { l: "Wellness", v: `${wellness.wellnessScore ?? 0}/100` },
                            { l: "Focus",    v: `${wellness.focusScore ?? 0}%` },
                            { l: "Stress",   v: `${wellness.stressScore ?? 0}%` },
                            { l: "Energy",   v: `${wellness.energyLevel ?? 0}%` },
                        ].map((m, i) => (
                            <div key={i} style={{ fontSize: 11 }}>
                                <span style={{ color: S.textDim, fontFamily: S.mono }}>{m.l}: </span>
                                <span style={{ color: S.text, fontWeight: 700, fontFamily: S.mono }}>{m.v}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 11, color: S.textDim, fontFamily: S.mono }}>
                        Start camera on /dashboard to begin live measurement
                    </div>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <footer style={{
                padding:   "28px 24px",
                textAlign: "center",
                borderTop: `1px solid ${S.border}`,
            }}>
                <p style={{ fontSize: 11, color: S.textDim, fontFamily: S.mono, letterSpacing: "0.06em", marginBottom: 6 }}>
                    🔒 ALL SENSOR DATA PROCESSED LOCALLY — NOTHING LEAVES YOUR DEVICE
                </p>
                <p style={{ fontSize: 10, color: "#2d333b", fontFamily: S.mono }}>
                    MindGuard · Cognitive Wellness Intelligence · AI insights are assistive and not a medical diagnosis
                </p>
            </footer>
        </div>
    );
}
