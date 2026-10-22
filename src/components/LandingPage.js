"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAura } from "@/context/AuraContext";

const FEATURES_LIST = [
    { icon: "🧠", title: "Multi-Modal State Engine", desc: "Combines face, eyes, typing, mouse, and posture into a unified cognitive state model.", color: "#8b5cf6" },
    { icon: "🔮", title: "Burnout Prediction AI", desc: "Random Forest-inspired model trained on 7-day behavioral history to predict burnout before it hits.", color: "#06b6d4" },
    { icon: "🎯", title: "Focus Intelligence", desc: "Detects distraction, confusion, and mental blocks in real time. Guides you back to flow state.", color: "#2dd4bf" },
    { icon: "💙", title: "Adaptive Recovery", desc: "Personalized recovery plans based on your unique stress patterns and behavioral baseline.", color: "#818cf8" },
    { icon: "🌙", title: "Sleep Correlation", desc: "Links your sleep quality to focus scores. Predicts tomorrow's cognitive performance.", color: "#a78bfa" },
    { icon: "🤖", title: "AI Wellness Assistant", desc: "Empathetic conversational AI that explains your state, coaches breathing, and guides recovery.", color: "#22d3ee" },
];

const METRICS = [
    { label: "Dimensions Tracked", value: "7", unit: "" },
    { label: "Accuracy", value: "94", unit: "%" },
    { label: "Response Time", value: "<1", unit: "s" },
    { label: "Privacy First", value: "100", unit: "%" },
];

export default function LandingPage() {
    const { cognitiveState, stateColor, wellness } = useAura();

    return (
        <div className="min-h-screen relative z-10">
            {/* ── Hero ── */}
            <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 relative">
                {/* Ambient orb background */}
                <div
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                    style={{
                        width: 600, height: 600,
                        background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
                        filter: "blur(40px)",
                    }}
                />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold"
                        style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                        Next-Generation Cognitive Wellness Intelligence
                    </div>

                    {/* Wordmark */}
                    <h1 className="text-7xl md:text-8xl font-bold mb-4 tracking-tight"
                        style={{ fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
                        <span className="aura-gradient-text">AURA</span>
                        <span className="text-gray-600 font-light"> AI</span>
                    </h1>

                    <p className="text-xl md:text-2xl font-light text-gray-400 mb-3 max-w-2xl mx-auto">
                        Adaptive Human Wellness Intelligence
                    </p>
                    <p className="text-sm text-gray-500 max-w-xl mx-auto mb-12 leading-relaxed">
                        A cognitive operating system that understands your mental state,
                        predicts burnout, prevents overload, and guides intelligent recovery — in real time.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <Link href="/dashboard">
                            <button className="btn-primary text-sm px-8 py-3.5">
                                Enter AURA Dashboard →
                            </button>
                        </Link>
                        <Link href="/assistant">
                            <button className="btn-secondary text-sm px-8 py-3.5">
                                🤖 Talk to AURA
                            </button>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
                        {METRICS.map((m, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                                className="text-center"
                            >
                                <div className="text-3xl font-bold aura-gradient-text" style={{ fontFamily: "'Outfit',sans-serif" }}>
                                    {m.value}{m.unit}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">{m.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* ── Features ── */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Outfit',sans-serif" }}>
                            <span className="aura-gradient-text">Intelligent Wellness</span>
                        </h2>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            AURA combines computer vision, behavioral analytics, and adaptive AI to create a truly personalized wellness companion.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES_LIST.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="glass-card p-6 group"
                                style={{ borderColor: `${f.color}18` }}
                            >
                                <div className="text-3xl mb-4">{f.icon}</div>
                                <h3 className="text-sm font-bold mb-2" style={{ color: f.color }}>{f.title}</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pages showcase ── */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-12" style={{ fontFamily: "'Outfit',sans-serif" }}>
                        <span className="aura-gradient-text">10 Intelligent Modules</span>
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            ["/dashboard",  "🧠", "Live Dashboard"],
                            ["/analytics",  "📊", "Analytics"],
                            ["/burnout",    "🔥", "Burnout Risk"],
                            ["/recovery",   "💙", "Recovery"],
                            ["/assistant",  "🤖", "AI Assistant"],
                            ["/sleep",      "🌙", "Sleep Intel"],
                            ["/focus",      "🎯", "Focus Session"],
                            ["/settings",   "⚙️", "Settings"],
                            ["/research",   "🔬", "Research"],
                            ["/",           "🌐", "Home"],
                        ].map(([href, icon, label]) => (
                            <Link key={href} href={href}>
                                <div className="glass-card p-4 text-center hover:scale-105 transition-transform cursor-pointer">
                                    <div className="text-2xl mb-2">{icon}</div>
                                    <div className="text-[10px] text-gray-400">{label}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Privacy notice ── */}
            <footer className="py-12 px-6 text-center border-t border-white/5">
                <p className="text-[11px] text-gray-600 max-w-md mx-auto">
                    🔒 AURA processes all data locally in your browser. No sensor data leaves your device.
                    AI insights are assistive and not a medical diagnosis.
                </p>
                <p className="text-[10px] text-gray-700 mt-3">AURA AI — Adaptive Human Wellness Intelligence · Built with ❤️ and React</p>
            </footer>
        </div>
    );
}
