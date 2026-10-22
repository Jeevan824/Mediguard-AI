"use client";
import { motion } from "framer-motion";
import { HiSparkles, HiEye, HiCpuChip, HiChartBar } from "react-icons/hi2";

const cards = [
    {
        icon: <HiSparkles className="text-3xl text-indigo-400" />,
        title: "Cognitive Load Detection",
        desc: "AI analyzes behavioral patterns to detect when mental workload exceeds optimal levels, preventing burnout before it occurs.",
    },
    {
        icon: <HiEye className="text-3xl text-cyan-400" />,
        title: "Eye Tracking & Blink Analysis",
        desc: "Computer Vision monitors eye blink rate and gaze patterns using MediaPipe facial landmarks to assess fatigue in real time.",
    },
    {
        icon: <HiCpuChip className="text-3xl text-purple-400" />,
        title: "Behavioral Analytics",
        desc: "Machine Learning models analyze typing speed, mouse dynamics, and interaction patterns to build a comprehensive stress profile.",
    },
    {
        icon: <HiChartBar className="text-3xl text-emerald-400" />,
        title: "Smart Feedback System",
        desc: "Personalized recommendations delivered in real time — from break reminders to task difficulty adjustments based on cognitive state.",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
    }),
};

export default function AboutSection() {
    return (
        <section id="about" className="relative py-28 px-6">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-indigo-400 text-sm font-semibold tracking-widest uppercase mb-4 block">
                        About the Project
                    </span>
                    <h2 className="section-title">
                        <span className="gradient-text">Understanding Mental Overload</span>
                    </h2>
                    <p className="section-subtitle">
                        Our system combines computer vision, behavioral analysis, and machine
                        learning to create a real-time cognitive load monitoring platform that
                        helps users maintain peak performance.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-6">
                    {cards.map((card, i) => (
                        <motion.div
                            key={i}
                            custom={i}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            variants={fadeUp}
                            className="glass-card p-8"
                        >
                            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-5">
                                {card.icon}
                            </div>
                            <h3
                                className="text-xl font-semibold text-white mb-3"
                                style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
                            >
                                {card.title}
                            </h3>
                            <p className="text-gray-400 leading-relaxed text-sm">
                                {card.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
