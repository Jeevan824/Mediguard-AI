"use client";

/**
 * AuraCard — Premium glassmorphism card with optional glow border.
 * @param {{ children: React.ReactNode, className?: string, glow?: string, padding?: string, hover?: boolean }} props
 */
export default function AuraCard({ children, className = "", glow, padding = "p-6", hover = false }) {
    const glowStyle = glow ? { boxShadow: `0 0 24px ${glow}20` } : {};
    const borderColor = glow ? `${glow}30` : "#21262d";

    return (
        <div
            className={`relative transition-all duration-200 ${padding} ${hover ? "hover:border-opacity-60" : ""} ${className}`}
            style={{
                background:   "#161b22",
                border:       `1px solid ${borderColor}`,
                borderRadius: 6,
                ...glowStyle,
            }}
        >
            {children}
        </div>
    );
}

/**
 * AuraCardHeader — Consistent card header with label and optional badge.
 */
export function AuraCardHeader({ label, badge, icon }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #21262d" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
                <h3 style={{
                    fontFamily:    "'JetBrains Mono','Courier New',monospace",
                    fontSize:      10,
                    fontWeight:    700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color:         "#e6a817",
                    margin:        0,
                }}>{label}</h3>
            </div>
            {badge}
        </div>
    );
}
