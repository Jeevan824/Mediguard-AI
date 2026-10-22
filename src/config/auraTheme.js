/**
 * AURA AI — Design Tokens & Theme Configuration
 * Central source of truth for the AURA visual system.
 */

export const AURA_THEME = {
  colors: {
    // Core void palette
    void: {
      950: "#02020f",
      900: "#04040e",
      800: "#070718",
      700: "#0a0a20",
      600: "#0f0f2e",
    },
    // Neural purple
    neural: {
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      glow: "rgba(139,92,246,0.3)",
    },
    // Aurora teal
    aurora: {
      300: "#5eead4",
      400: "#2dd4bf",
      500: "#14b8a6",
      glow: "rgba(20,184,166,0.3)",
    },
    // Bioluminescent cyan
    bio: {
      300: "#67e8f9",
      400: "#22d3ee",
      500: "#06b6d4",
      glow: "rgba(6,182,212,0.3)",
    },
    // Warning amber
    amber: {
      400: "#fbbf24",
      500: "#f59e0b",
      glow: "rgba(245,158,11,0.3)",
    },
    // Danger crimson
    crimson: {
      400: "#f87171",
      500: "#ef4444",
      glow: "rgba(239,68,68,0.3)",
    },
    // Wellness states
    states: {
      optimal:   "#2dd4bf",   // teal
      focused:   "#818cf8",   // indigo
      fatigued:  "#a78bfa",   // purple
      stressed:  "#f59e0b",   // amber
      overloaded:"#ef4444",   // red
      recovering:"#34d399",   // emerald
    },
  },

  gradients: {
    aura:     "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #2dd4bf 100%)",
    neural:   "linear-gradient(135deg, #1e1b4b 0%, #0f0f2e 100%)",
    void:     "linear-gradient(180deg, #02020f 0%, #070718 100%)",
    aurora:   "linear-gradient(135deg, #0f172a 0%, #1a0a2e 50%, #0a1a2e 100%)",
    stress:   "linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)",
    focus:    "linear-gradient(135deg, #818cf8, #6366f1)",
    wellness: "linear-gradient(135deg, #2dd4bf, #14b8a6)",
  },

  glows: {
    purple: "0 0 40px rgba(139,92,246,0.25), 0 0 80px rgba(139,92,246,0.10)",
    teal:   "0 0 40px rgba(20,184,166,0.25),  0 0 80px rgba(20,184,166,0.10)",
    cyan:   "0 0 40px rgba(6,182,212,0.25),   0 0 80px rgba(6,182,212,0.10)",
    amber:  "0 0 40px rgba(245,158,11,0.25),  0 0 80px rgba(245,158,11,0.10)",
    red:    "0 0 40px rgba(239,68,68,0.25),   0 0 80px rgba(239,68,68,0.10)",
  },

  glass: {
    card:   "rgba(10,10,30,0.7)",
    border: "rgba(139,92,246,0.15)",
    hover:  "rgba(139,92,246,0.25)",
    nav:    "rgba(4,4,14,0.85)",
  },
};

/**
 * Returns a color based on a 0-100 wellness score.
 * @param {number} score
 * @returns {string}
 */
export function scoreToColor(score) {
  if (score >= 75) return AURA_THEME.colors.states.optimal;
  if (score >= 55) return AURA_THEME.colors.states.focused;
  if (score >= 40) return AURA_THEME.colors.states.fatigued;
  if (score >= 25) return AURA_THEME.colors.states.stressed;
  return AURA_THEME.colors.states.overloaded;
}

/**
 * Returns cognitive state label from wellness score.
 * @param {number} score
 * @returns {string}
 */
export function scoreToState(score) {
  if (score >= 80) return "Peak Performance";
  if (score >= 65) return "Deep Focus";
  if (score >= 50) return "Steady Flow";
  if (score >= 35) return "Mental Fatigue";
  if (score >= 20) return "High Stress";
  return "Overload Risk";
}
