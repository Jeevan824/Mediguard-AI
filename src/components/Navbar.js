"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useHealth } from "@/context/HealthContext";
import { HydrationBadge } from "@/components/health/HydrationReminder";
import { FEATURES } from "@/config/features";

const NAV_LINKS = [
    { href: "/",              label: "Home",          icon: "⌂",  exact: true  },
    { href: "/dashboard",     label: "Dashboard",     icon: "▦"               },
    { href: "/driver-safety", label: "Driver Safety", icon: "◎"               },
    { href: "/powerbi",       label: "Power BI",      icon: "▤"               },
    { href: "/analytics",     label: "Analytics",     icon: "∿"               },
    { href: "/focus",         label: "Focus",         icon: "◈"               },
    { href: "/burnout",       label: "Burnout",       icon: "⚡"              },
    { href: "/recovery",      label: "Recovery",      icon: "◑"               },
    { href: "/sleep",         label: "Sleep",         icon: "☽"               },
    { href: "/assistant",     label: "Assistant",     icon: "✦"               },
    { href: "/settings",      label: "Settings",      icon: "⚙"               },
];

export default function Navbar() {
    const [scrolled,  setScrolled]  = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { triggerBreathing } = useHealth();
    const pathname = usePathname();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const isActive = (link) =>
        link.exact ? pathname === link.href : pathname.startsWith(link.href);

    const currentPage = NAV_LINKS.find(l => isActive(l))?.label ?? "MindGuard";

    return (
        <>
            {/* ── Top navigation bar ──────────────────────────────────────── */}
            <nav
                style={{
                    position:       "fixed",
                    top:            0,
                    left:           0,
                    right:          0,
                    zIndex:         50,
                    background:     scrolled ? "#0d1117" : "rgba(13,17,23,0.96)",
                    borderBottom:   `1px solid ${scrolled ? "#30363d" : "#21262d"}`,
                    boxShadow:      scrolled ? "0 1px 0 #21262d" : "none",
                    transition:     "all 0.2s ease",
                    fontFamily:     "'Inter', system-ui, sans-serif",
                }}
            >
                {/* ── Upper strip: Logo + breadcrumb + utilities ── */}
                <div style={{
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "space-between",
                    padding:        "0 20px",
                    height:         44,
                    borderBottom:   "1px solid #161b22",
                }}>
                    {/* Logo */}
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                        <div style={{
                            width: 26, height: 26,
                            background:  "#e6a817",
                            borderRadius: 4,
                            display:     "flex",
                            alignItems:  "center",
                            justifyContent: "center",
                            fontFamily:  "'Courier New', monospace",
                            fontWeight:  900,
                            fontSize:    13,
                            color:       "#0d1117",
                            letterSpacing: "-.05em",
                        }}>M</div>
                        <span style={{
                            fontFamily:  "'Courier New', monospace",
                            fontWeight:  700,
                            fontSize:    14,
                            color:       "#e6edf3",
                            letterSpacing: "-.02em",
                        }}>
                            MindGuard<span style={{ color: "#e6a817" }}>.ai</span>
                        </span>
                    </Link>

                    {/* Current page breadcrumb */}
                    <div style={{
                        display:    "flex",
                        alignItems: "center",
                        gap:        6,
                        fontFamily: "'Courier New', monospace",
                        fontSize:   11,
                        color:      "#8b949e",
                    }}>
                        <span style={{ color: "#30363d" }}>/</span>
                        <span style={{ color: "#e6a817", fontWeight: 700 }}>{currentPage}</span>
                    </div>

                    {/* Utility row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <HydrationBadge />
                        {FEATURES.breathingGuide && (
                            <button
                                onClick={triggerBreathing}
                                style={{
                                    display:     "flex",
                                    alignItems:  "center",
                                    gap:         4,
                                    padding:     "4px 10px",
                                    fontSize:    11,
                                    fontWeight:  600,
                                    borderRadius: 4,
                                    background:  "rgba(63,185,80,0.08)",
                                    color:       "#3fb950",
                                    border:      "1px solid rgba(63,185,80,0.2)",
                                    cursor:      "pointer",
                                    fontFamily:  "inherit",
                                }}
                                title="Guided breathing exercise"
                            >
                                ◎ Breathe
                            </button>
                        )}
                        {/* Mobile toggle */}
                        <button
                            onClick={() => setMobileOpen(o => !o)}
                            style={{
                                display:      "none",
                                padding:      "4px 8px",
                                background:   "transparent",
                                border:       "1px solid #30363d",
                                borderRadius: 4,
                                color:        "#8b949e",
                                cursor:       "pointer",
                                fontSize:     16,
                            }}
                            className="nav-mobile-toggle"
                        >☰</button>
                    </div>
                </div>

                {/* ── Nav link strip ── */}
                <div style={{
                    display:    "flex",
                    alignItems: "center",
                    gap:        2,
                    padding:    "0 16px",
                    height:     36,
                    overflowX:  "auto",
                }}>
                    {NAV_LINKS.map(link => {
                        const active = isActive(link);
                        return (
                            <Link key={link.href} href={link.href}
                                style={{
                                    display:        "flex",
                                    alignItems:     "center",
                                    gap:            5,
                                    padding:        "4px 10px",
                                    borderRadius:   4,
                                    fontSize:       12,
                                    fontWeight:     active ? 600 : 400,
                                    color:          active ? "#e6a817" : "#8b949e",
                                    background:     active ? "rgba(230,168,23,0.08)" : "transparent",
                                    borderBottom:   active ? "2px solid #e6a817" : "2px solid transparent",
                                    textDecoration: "none",
                                    whiteSpace:     "nowrap",
                                    transition:     "all 0.15s ease",
                                    letterSpacing:  "0.01em",
                                }}
                            >
                                <span style={{ fontSize: 11 }}>{link.icon}</span>
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Spacer for fixed nav (44 + 36 = 80px) */}
            <div style={{ height: 80 }} />

            <style>{`
                @media (max-width: 768px) {
                    .nav-mobile-toggle { display: flex !important; }
                }
            `}</style>
        </>
    );
}
