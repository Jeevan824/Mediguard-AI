"use client";
import { motion } from "framer-motion";
import {
    HiUser,
    HiCircleStack,
    HiCpuChip,
    HiCog6Tooth,
    HiShieldCheck,
    HiBell,
} from "react-icons/hi2";

const steps = [
    {
        icon: <HiUser className="text-2xl" />,
        title: "User Interaction",
        desc: "Real-time monitoring of user behavior through webcam and input devices",
        color: "from-indigo-500 to-indigo-600",
    },
    {
        icon: <HiCircleStack className="text-2xl" />,
        title: "Data Collection",
        desc: "Eye blinks, typing speed, mouse dynamics, and facial expressions",
        color: "from-purple-500 to-purple-600",
    },
    {
        icon: <HiCog6Tooth className="text-2xl" />,
        title: "Feature Extraction",
        desc: "MediaPipe & OpenCV process raw data into meaningful features",
        color: "from-violet-500 to-violet-600",
    },
    {
        icon: <HiCpuChip className="text-2xl" />,
        title: "Machine Learning",
        desc: "Scikit-learn models classify cognitive load levels with 98.6% accuracy",
        color: "from-blue-500 to-blue-600",
    },
    {
        icon: <HiShieldCheck className="text-2xl" />,
        title: "Overload Detection",
        desc: "Real-time classification: Low, Medium, or High cognitive load",
        color: "from-cyan-500 to-cyan-600",
    },
    {
        icon: <HiBell className="text-2xl" />,
        title: "Smart Feedback",
        desc: "Personalized alerts, break suggestions, and task adjustments",
        color: "from-teal-500 to-teal-600",
    },
];

export default function ArchitectureSection() {
    return (
        <section id="architecture" className="relative py-28 px-6 overflow-hidden">
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-4 block">
                        How It Works
                    </span>
                    <h2 className="section-title">
                        <span className="gradient-text">System Architecture</span>
                    </h2>
                    <p className="section-subtitle">
                        A six-stage intelligent pipeline that transforms raw behavioral data
                        into actionable cognitive insights.
                    </p>
                </motion.div>

                {/* Pipeline */}
                <div className="relative">
                    {/* Connection line */}
                    <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-cyan-500/30 -translate-y-1/2 z-0" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                className="relative z-10"
                            >
                                <div className="glass-card p-5 text-center h-full flex flex-col items-center">
                                    <div
                                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white mb-4 shadow-lg`}
                                    >
                                        {step.icon}
                                    </div>
                                    <div className="text-xs text-indigo-400/60 font-mono mb-2">
                                        STEP {String(i + 1).padStart(2, "0")}
                                    </div>
                                    <h3
                                        className="text-sm font-semibold text-white mb-2"
                                        style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
                                    >
                                        {step.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {step.desc}
                                    </p>
                                </div>

                                {/* Arrow */}
                                {i < steps.length - 1 && (
                                    <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-indigo-500/50 text-lg">
                                        →
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
