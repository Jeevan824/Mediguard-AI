"use client";
import { useAura } from "@/context/AuraContext";
import { scoreToColor } from "@/config/auraTheme";

/**
 * AuraOrb — Central animated wellness visualization orb.
 * Pulsing glow adapts to wellness score. Size and animation speed reflect energy.
 * @param {{ size?: 'sm'|'md'|'lg'|'xl', showScore?: boolean, showState?: boolean }} props
 */
export default function AuraOrb({ size = "xl", showScore = true, showState = true }) {
    const { wellness, cognitiveState, stateColor } = useAura();
    const { wellnessScore, energyLevel } = wellness;

    const dim = { sm: 80, md: 120, lg: 180, xl: 240 }[size];
    const fontSize = { sm: "text-lg", md: "text-2xl", lg: "text-3xl", xl: "text-5xl" }[size];
    const pulseDuration = `${2.5 - energyLevel / 100}s`; // higher energy = faster pulse

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="relative flex items-center justify-center"
                style={{ width: dim, height: dim }}
            >
                {/* Outer pulse ring */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle, ${stateColor}20 0%, transparent 70%)`,
                        animation: `orb-pulse ${pulseDuration} ease-in-out infinite`,
                        transform: "scale(1.4)",
                    }}
                />
                {/* Mid glow ring */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle, ${stateColor}15 0%, transparent 65%)`,
                        animation: `orb-pulse ${pulseDuration} ease-in-out infinite`,
                        animationDelay: "0.5s",
                        transform: "scale(1.25)",
                    }}
                />
                {/* Core orb */}
                <div
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                        width: dim * 0.7,
                        height: dim * 0.7,
                        background: `radial-gradient(circle at 35% 35%, ${stateColor}40 0%, ${stateColor}15 50%, ${stateColor}05 100%)`,
                        border: `1.5px solid ${stateColor}40`,
                        boxShadow: `0 0 ${dim * 0.2}px ${stateColor}40, 0 0 ${dim * 0.4}px ${stateColor}15, inset 0 0 ${dim * 0.15}px ${stateColor}20`,
                        backdropFilter: "blur(10px)",
                    }}
                >
                    {showScore && (
                        <div className="text-center">
                            <div
                                className={`font-bold leading-none ${fontSize}`}
                                style={{ color: stateColor, textShadow: `0 0 20px ${stateColor}80` }}
                            >
                                {wellnessScore}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 tracking-widest uppercase">
                                Wellness
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showState && (
                <div className="text-center">
                    <div
                        className="text-sm font-semibold tracking-wide"
                        style={{ color: stateColor, textShadow: `0 0 12px ${stateColor}60` }}
                    >
                        {cognitiveState}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Cognitive State</div>
                </div>
            )}
        </div>
    );
}
