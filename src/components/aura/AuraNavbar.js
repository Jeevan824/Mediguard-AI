"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StateIndicator from "@/components/aura/StateIndicator";
import { useHealth } from "@/context/HealthContext";
import { HydrationBadge } from "@/components/health/HydrationReminder";
import { FEATURES } from "@/config/features";
import { useDataset } from "@/context/DatasetContext";

const NAV_ITEMS = [
    { href: "/",           icon: "🌐", label: "Home",          short: "Home" },
    { href: "/dashboard",  icon: "🧠", label: "Live Dashboard", short: "Live" },
    { href: "/analytics",  icon: "📊", label: "Analytics",     short: "Data" },
    { href: "/burnout",    icon: "🔥", label: "Burnout Risk",  short: "Risk" },
    { href: "/recovery",   icon: "💙", label: "Recovery",      short: "Heal" },
    { href: "/assistant",  icon: "🤖", label: "AI Assistant",  short: "AURA" },
    { href: "/sleep",      icon: "🌙", label: "Sleep Intel",   short: "Sleep" },
    { href: "/focus",      icon: "🎯", label: "Focus Session", short: "Focus" },
    { href: "/settings",   icon: "⚙️", label: "Settings",      short: "Prefs" },
    { href: "/powerbi",    icon: "📈", label: "Power BI",      short: "PBI" },
    { href: "/research",   icon: "🔬", label: "Research",      short: "Lab" },
];

/**
 * AuraNavbar — Collapsible sidebar + floating top bar navigation.
 */
export default function AuraNavbar() {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(false);
    const { triggerBreathing } = useHealth();
    const { demoMode, toggleDemo } = useDataset();

    return (
        <>
            {/* ── Floating top bar ── */}
            <div
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3"
                style={{
                    background: "rgba(4,4,14,0.85)",
                    backdropFilter: "blur(20px)",
                    borderBottom: "1px solid rgba(139,92,246,0.1)",
                }}
            >
                {/* Left: logo + sidebar toggle */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        {expanded ? "✕" : "☰"}
                    </button>

                    <Link href="/" className="flex items-center gap-2">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }}
                        >
                            A
                        </div>
                        <span
                            className="text-base font-bold tracking-tight"
                            style={{ fontFamily: "'Outfit',sans-serif" }}
                        >
                            AURA<span className="text-indigo-400 font-light">.ai</span>
                        </span>
                    </Link>
                </div>

                {/* Center: state indicator */}
                <div className="hidden md:block">
                    <StateIndicator />
                </div>

                {/* Right: quick actions */}
                <div className="flex items-center gap-2">
                    <HydrationBadge />
                    {FEATURES.breathingGuide && (
                        <button
                            onClick={triggerBreathing}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all"
                            style={{
                                background: "rgba(20,184,166,0.1)",
                                border: "1px solid rgba(20,184,166,0.2)",
                                color: "#2dd4bf",
                            }}
                        >
                            🫁 Breathe
                        </button>
                    )}
                    <button
                        onClick={toggleDemo}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all"
                        style={{
                            background: demoMode ? "rgba(239,68,68,0.15)" : "rgba(99,102,241,0.1)",
                            border: demoMode ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(99,102,241,0.2)",
                            color: demoMode ? "#f87171" : "#818cf8",
                        }}
                    >
                        {demoMode ? "Exit Demo" : "Demo Data"}
                    </button>
                    <Link
                        href="/assistant"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all"
                        style={{
                            background: "rgba(139,92,246,0.1)",
                            border: "1px solid rgba(139,92,246,0.2)",
                            color: "#a78bfa",
                        }}
                    >
                        🤖 AURA
                    </Link>
                </div>
            </div>

            {/* ── Sidebar ── */}
            <AnimatePresence>
                {expanded && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 z-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setExpanded(false)}
                            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                        />

                        {/* Sidebar panel */}
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col pt-16 pb-6 px-3"
                            style={{
                                background: "rgba(4,4,14,0.97)",
                                backdropFilter: "blur(30px)",
                                borderRight: "1px solid rgba(139,92,246,0.12)",
                            }}
                        >
                            {/* State indicator (mobile) */}
                            <div className="px-2 mb-4">
                                <StateIndicator />
                            </div>

                            {/* Nav items */}
                            <nav className="flex-1 space-y-0.5 overflow-y-auto">
                                {NAV_ITEMS.map((item) => {
                                    const active = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setExpanded(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                                            style={{
                                                background: active ? "rgba(139,92,246,0.15)" : "transparent",
                                                color: active ? "#a78bfa" : "#6b7280",
                                                border: active ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
                                            }}
                                        >
                                            <span className="text-base">{item.icon}</span>
                                            <span className="font-medium">{item.label}</span>
                                            {active && (
                                                <div
                                                    className="ml-auto w-1.5 h-1.5 rounded-full"
                                                    style={{ background: "#a78bfa" }}
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Footer */}
                            <div className="px-2 pt-4 border-t border-white/5">
                                <p className="text-[9px] text-gray-600 text-center leading-relaxed">
                                    AURA AI insights are assistive,<br />not medical diagnosis.
                                </p>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
