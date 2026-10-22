"use client";
import { useAura } from "@/context/AuraContext";

/**
 * StateIndicator — Animated pill badge showing current cognitive state.
 * @param {{ compact?: boolean }} props
 */
export default function StateIndicator({ compact = false }) {
    const { cognitiveState, stateColor, wellness } = useAura();

    return (
        <div
            className={`flex items-center gap-2 rounded-full transition-all ${compact ? "px-2 py-1" : "px-3 py-1.5"}`}
            style={{
                background: `${stateColor}12`,
                border: `1px solid ${stateColor}30`,
            }}
        >
            <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: stateColor, boxShadow: `0 0 6px ${stateColor}` }}
            />
            <span
                className={`font-semibold ${compact ? "text-[10px]" : "text-xs"}`}
                style={{ color: stateColor }}
            >
                {cognitiveState}
            </span>
            {!compact && (
                <span className="text-[10px] text-gray-500">
                    {wellness.wellnessScore}/100
                </span>
            )}
        </div>
    );
}
