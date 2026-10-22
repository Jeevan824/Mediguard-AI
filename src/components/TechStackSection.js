"use client";
import { motion } from "framer-motion";
import {
    SiPython,
    SiOpencv,
    SiScikitlearn,
} from "react-icons/si";
import {
    HiCpuChip,
    HiEye,
    HiBeaker,
} from "react-icons/hi2";

const techs = [
    { icon: <SiPython className="text-2xl" />, label: "Python", color: "text-yellow-400" },
    { icon: <SiOpencv className="text-2xl" />, label: "OpenCV", color: "text-green-400" },
    { icon: <HiEye className="text-2xl" />, label: "MediaPipe", color: "text-blue-400" },
    { icon: <SiScikitlearn className="text-2xl" />, label: "Scikit-learn", color: "text-orange-400" },
    { icon: <HiCpuChip className="text-2xl" />, label: "AI / ML", color: "text-indigo-400" },
    { icon: <HiBeaker className="text-2xl" />, label: "Computer Vision", color: "text-cyan-400" },
];

export default function TechStackSection() {
    return (
        <section id="tech" className="relative py-28 px-6">
            <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[120px]" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-purple-400 text-sm font-semibold tracking-widest uppercase mb-4 block">
                        Built With
                    </span>
                    <h2 className="section-title">
                        <span className="gradient-text">Technology Stack</span>
                    </h2>
                    <p className="section-subtitle">
                        Powered by industry-leading open-source technologies for
                        computer vision, machine learning, and real-time analytics.
                    </p>
                </motion.div>

                <div className="flex flex-wrap justify-center gap-4">
                    {techs.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.4 }}
                            whileHover={{ scale: 1.08 }}
                            className="tech-badge"
                        >
                            <span className={t.color}>{t.icon}</span>
                            {t.label}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
