"use client";
import { motion } from "framer-motion";
import {
    HiDevicePhoneMobile,
    HiBuildingOffice2,
    HiHeart,
} from "react-icons/hi2";

const scopes = [
    {
        icon: <HiDevicePhoneMobile className="text-3xl text-indigo-400" />,
        title: "Wearable Integration",
        desc: "Extend cognitive monitoring to smartwatches and wearable devices for continuous, non-intrusive health tracking throughout the day.",
        tag: "Hardware",
    },
    {
        icon: <HiBuildingOffice2 className="text-3xl text-cyan-400" />,
        title: "Smart Workplace Systems",
        desc: "Deploy AI-powered environment controls that adapt lighting, temperature, and ambient conditions based on collective cognitive states.",
        tag: "Enterprise",
    },
    {
        icon: <HiHeart className="text-3xl text-rose-400" />,
        title: "AI Health Monitoring",
        desc: "Expand into predictive mental health diagnostics, providing early warning systems for anxiety, depression, and chronic stress.",
        tag: "Healthcare",
    },
];

export default function FutureScopeSection() {
    return (
        <section id="future" className="relative py-28 px-6">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />

            <div className="max-w-5xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-rose-400 text-sm font-semibold tracking-widest uppercase mb-4 block">
                        What&apos;s Next
                    </span>
                    <h2 className="section-title">
                        <span className="gradient-text">Future Scope</span>
                    </h2>
                    <p className="section-subtitle">
                        Expanding the boundaries of cognitive AI into new domains
                        and form factors.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {scopes.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: i * 0.15, duration: 0.5 }}
                            className="glass-card p-8 relative overflow-hidden group"
                        >
                            {/* Gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                                        {s.icon}
                                    </div>
                                    <span className="text-xs font-mono text-gray-500 px-3 py-1 rounded-full border border-white/5">
                                        {s.tag}
                                    </span>
                                </div>
                                <h3
                                    className="text-lg font-semibold text-white mb-3"
                                    style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
                                >
                                    {s.title}
                                </h3>
                                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
