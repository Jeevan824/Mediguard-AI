"use client";
import { motion } from "framer-motion";
import {
    HiRocketLaunch,
    HiBolt,
    HiLightBulb,
    HiCursorArrowRays,
} from "react-icons/hi2";

const benefits = [
    {
        icon: <HiRocketLaunch className="text-3xl text-indigo-400" />,
        title: "Improved Productivity",
        desc: "Optimize work sessions by detecting fatigue early and suggesting strategic breaks for maximum output.",
    },
    {
        icon: <HiBolt className="text-3xl text-amber-400" />,
        title: "Reduced Mental Fatigue",
        desc: "Proactively prevent cognitive exhaustion with smart workload management and personalized pacing.",
    },
    {
        icon: <HiLightBulb className="text-3xl text-cyan-400" />,
        title: "Real-Time AI Insights",
        desc: "Continuous monitoring provides actionable intelligence about your cognitive state and work patterns.",
    },
    {
        icon: <HiCursorArrowRays className="text-3xl text-emerald-400" />,
        title: "Better Human-Computer Interaction",
        desc: "Adaptive interfaces that respond to your mental state, creating a more intuitive computing experience.",
    },
];

export default function ImpactSection() {
    return (
        <section id="impact" className="relative py-28 px-6">
            <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px]" />

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4 block">
                        Why It Matters
                    </span>
                    <h2 className="section-title">
                        <span className="gradient-text">Transformative Impact</span>
                    </h2>
                    <p className="section-subtitle">
                        Our AI-powered system delivers measurable improvements in
                        human performance, well-being, and productivity.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {benefits.map((b, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: i * 0.12, duration: 0.5 }}
                            className="glass-card p-7 text-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
                                {b.icon}
                            </div>
                            <h3
                                className="text-base font-semibold text-white mb-3"
                                style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
                            >
                                {b.title}
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed">{b.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
