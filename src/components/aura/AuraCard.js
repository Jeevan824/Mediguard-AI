"use client";

/**
 * AuraCard — Premium glassmorphism card with optional glow border.
 * @param {{ children: React.ReactNode, className?: string, glow?: string, padding?: string, hover?: boolean }} props
 */
export default function AuraCard({ children, className = "", glow, padding = "p-6", hover = false }) {
    const glowStyle = glow ? { boxShadow: `0 0 30px ${glow}25, 0 0 60px ${glow}10` } : {};
    const borderColor = glow ? `${glow}25` : "rgba(139,92,246,0.12)";

    return (
        <div
            className={`relative rounded-2xl backdrop-blur-xl transition-all duration-300 ${padding} ${hover ? "hover:-translate-y-1" : ""} ${className}`}
            style={{
                background: "rgba(7,7,24,0.75)",
                border: `1px solid ${borderColor}`,
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
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                {icon && <span className="text-base">{icon}</span>}
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</h3>
            </div>
            {badge}
        </div>
    );
}
