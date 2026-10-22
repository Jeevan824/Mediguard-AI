/**
 * Cognitive Load Calculator — Enhanced v2.
 * 5-signal weighted formula:
 *   CLI = (S_Blink × 0.25) + (S_Typing × 0.20) + (S_EAR × 0.20)
 *       + (S_Mouse × 0.20) + (S_HeadPose × 0.15)
 *
 * Additional signals:
 *  - IKI variance (keystroke rhythm erraticism)
 *  - Error rate (backspace ratio)
 *  - Head pose distraction (yaw/pitch from camera)
 *  - Mouse jerkiness (direction changes per sec)
 */

const WEIGHTS = {
    blinkRate:       0.25,
    typingDrop:      0.20,
    earFatigue:      0.20,
    mouseInactivity: 0.20,
    headPose:        0.15,
};

/**
 * @param {number}  blinkRate        - Blinks per minute
 * @param {number}  typingWPM        - Current WPM
 * @param {number}  ear              - Smoothed Eye Aspect Ratio
 * @param {number}  mouseIntensity   - 0-100 mouse activity score
 * @param {number}  baselineWPM      - Personal baseline WPM (default 50)
 * @param {Object}  extras           - Optional extra signals
 * @param {number}  extras.ikiVariance    - 0-100 IKI variance score
 * @param {number}  extras.errorRate      - 0-100 backspace error rate
 * @param {number}  extras.headDistraction- 0-100 head pose distraction
 * @param {number}  extras.jerkiness      - 0-100 mouse jerkiness
 * @returns {{ load: number, label: string, stress: number, breakdown: Object }}
 */
export function calculateCognitiveLoad(
    blinkRate,
    typingWPM,
    ear,
    mouseIntensity = 50,
    baselineWPM = 50,
    extras = {}
) {
    const { ikiVariance = 0, errorRate = 0, headDistraction = 0, jerkiness = 0 } = extras;

    // ── Blink rate score (0-100). Normal: 15-20 blinks/min ──────────────────
    let blinkScore = 0;
    if      (blinkRate <= 8)  blinkScore = 90; // very low = staring/fatigued
    else if (blinkRate <= 12) blinkScore = 60;
    else if (blinkRate <= 18) blinkScore = 15; // optimal range
    else if (blinkRate <= 24) blinkScore = 30;
    else if (blinkRate <= 35) blinkScore = 55;
    else                      blinkScore = 80; // excessive blinking

    // ── Typing drop score (0-100) ────────────────────────────────────────────
    let typingScore = 0;
    if (baselineWPM > 0 && typingWPM > 0) {
        const ratio = typingWPM / baselineWPM;
        if      (ratio >= 0.9) typingScore = 10;
        else if (ratio >= 0.7) typingScore = 30;
        else if (ratio >= 0.5) typingScore = 55;
        else if (ratio >= 0.3) typingScore = 75;
        else                   typingScore = 90;
    } else {
        typingScore = 15; // not actively typing — neutral
    }

    // Boost typing score with IKI variance (erratic rhythm = stress)
    const ikiBoost   = ikiVariance * 0.3;
    // Boost with error rate (more backspaces = struggling)
    const errorBoost = errorRate   * 0.2;
    typingScore      = Math.min(100, typingScore + ikiBoost + errorBoost);

    // ── EAR fatigue score (0-100). Normal open: 0.25-0.35 ───────────────────
    let earScore = 0;
    if      (ear >= 0.30) earScore = 5;
    else if (ear >= 0.26) earScore = 15;
    else if (ear >= 0.22) earScore = 40;
    else if (ear >= 0.18) earScore = 65;
    else                  earScore = 90;

    // ── Mouse inactivity + jerkiness (0-100) ────────────────────────────────
    let mouseScore = Math.max(0, 100 - mouseIntensity);
    // Jerkiness (frantic mouse = high stress signal)
    mouseScore     = Math.min(100, mouseScore * 0.7 + jerkiness * 0.3);

    // ── Head pose distraction (0-100) ────────────────────────────────────────
    const headScore = headDistraction; // already 0-100

    // ── Weighted CLI ─────────────────────────────────────────────────────────
    const load = Math.round(
        blinkScore * WEIGHTS.blinkRate       +
        typingScore  * WEIGHTS.typingDrop    +
        earScore     * WEIGHTS.earFatigue    +
        mouseScore   * WEIGHTS.mouseInactivity +
        headScore    * WEIGHTS.headPose
    );

    const clampedLoad = Math.max(0, Math.min(100, load));

    let label = "Low";
    if      (clampedLoad >= 70) label = "High";
    else if (clampedLoad >= 40) label = "Medium";

    // ── Stress score (emphasis on physiological signals) ─────────────────────
    const stress = Math.round(
        blinkScore * 0.35 +
        earScore   * 0.30 +
        mouseScore * 0.15 +
        typingScore * 0.12 +
        headScore  * 0.08
    );

    const breakdown = {
        blinkScore:  Math.round(blinkScore),
        typingScore: Math.round(typingScore),
        earScore:    Math.round(earScore),
        mouseScore:  Math.round(mouseScore),
        headScore:   Math.round(headScore),
        ikiVariance:  Math.round(ikiVariance),
        errorRate:    Math.round(errorRate),
        jerkiness:    Math.round(jerkiness),
    };

    return {
        load:  clampedLoad,
        label,
        stress: Math.max(0, Math.min(100, stress)),
        breakdown,
    };
}

/**
 * Get a readable breakdown of CLI components for display panels.
 */
export function getCLIBreakdown(breakdown) {
    return [
        { name: "Blink Rate",   score: breakdown.blinkScore,  weight: "25%", desc: "Eye blink frequency anomaly" },
        { name: "Typing Drop",  score: breakdown.typingScore, weight: "20%", desc: "WPM drop + IKI variance" },
        { name: "EAR Fatigue",  score: breakdown.earScore,    weight: "20%", desc: "Eye openness / heavy eyelids" },
        { name: "Mouse Signal", score: breakdown.mouseScore,  weight: "20%", desc: "Inactivity + jerkiness" },
        { name: "Head Pose",    score: breakdown.headScore,   weight: "15%", desc: "Yaw/pitch distraction" },
    ];
}
