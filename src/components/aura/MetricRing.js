"use client";

/**
 * MetricRing — Circular animated metric display with SVG arc.
 * @param {{ label: string, value: number, max?: number, color: string, size?: number, icon?: string, unit?: string }} props
 */
export default function MetricRing({ label, value, max = 100, color, size = 90, icon, unit = "" }) {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.max(0, Math.min(1, value / max));
    const dashOffset = circumference * (1 - pct);

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Track */}
                <svg width={size} height={size} className="-rotate-90" style={{ position: "absolute" }}>
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={6}
                    />
                    {/* Fill arc */}
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s ease" }}
                    />
                </svg>
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {icon && <span className="text-sm leading-none">{icon}</span>}
                    <span className="text-sm font-bold text-white leading-tight">
                        {Math.round(value)}{unit}
                    </span>
                </div>
            </div>
            <span className="text-[9px] text-gray-500 uppercase tracking-widest text-center max-w-[70px] leading-tight">
                {label}
            </span>
        </div>
    );
}
