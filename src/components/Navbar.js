"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useHealth } from "@/context/HealthContext";
import { HydrationBadge } from "@/components/health/HydrationReminder";
import { FEATURES } from "@/config/features";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const { triggerBreathing } = useHealth();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <motion.nav
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass-nav shadow-lg shadow-black/20" : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                <a href="#" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">M</span>
                    </div>
                    <span
                        className="text-lg font-bold tracking-tight"
                        style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
                    >
                        MindGuard<span className="text-indigo-400">.ai</span>
                    </span>
                </a>

                <div className="flex items-center gap-2">
                    {/* Hydration badge */}
                    <HydrationBadge />

                    <a href="#detection" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                        Detection
                    </a>
                    <a href="#dashboard" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                        Dashboard
                    </a>
                    <a href="/powerbi"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                        style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}
                        title="Open Power BI Analytics Dashboard"
                    >
                        <span>📊</span> Power BI
                    </a>

                    {/* Breathe button */}
                    {FEATURES.breathingGuide && (
                        <button
                            onClick={triggerBreathing}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-all"
                            title="Open guided breathing exercise"
                        >
                            <span>🫁</span> Breathe
                        </button>
                    )}
                </div>
            </div>
        </motion.nav>
    );
}
