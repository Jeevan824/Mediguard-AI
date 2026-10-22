/**
 * AURA AI — Multi-Dimensional Wellness Scorer — Enhanced v2.
 * Computes 7 wellness dimensions from real-time sensor data.
 * Now exports rawSignals for Power BI dashboard raw data panel.
 */

/**
 * Computes fatigue score from EAR, blink trends, and session duration.
 * @param {number} ear - Eye aspect ratio (0-0.5)
 * @param {number} blinkRate - Blinks per minute
 * @param {number} sessionMinutes - Session duration in minutes
 * @returns {number} 0-100 (higher = more fatigued)
 */
export function computeFatigueScore(ear, blinkRate, sessionMinutes) {
    // Low EAR = heavy eyelids
    let earFatigue = 0;
    if      (ear >= 0.30) earFatigue = 5;
    else if (ear >= 0.26) earFatigue = 20;
    else if (ear >= 0.22) earFatigue = 45;
    else if (ear >= 0.18) earFatigue = 70;
    else                  earFatigue = 90;

    // Very low blink rate = staring/fatigue; very high = eye irritation
    let blinkFatigue = 0;
    if      (blinkRate < 8)  blinkFatigue = 70;
    else if (blinkRate < 12) blinkFatigue = 45;
    else if (blinkRate < 20) blinkFatigue = 10;
    else if (blinkRate < 30) blinkFatigue = 25;
    else                     blinkFatigue = 55;

    // Session duration fatigue curve (exponential after 60 min)
    const sessionFatigue = Math.min(100, Math.pow(sessionMinutes / 60, 1.4) * 30);

    return Math.round(Math.min(100, earFatigue * 0.45 + blinkFatigue * 0.30 + sessionFatigue * 0.25));
}

/**
 * Computes focus score from behavioral signals.
 */
export function computeFocusScore(typingWPM, baselineWPM, mouseIntensity, mouseActive, cognitiveLoad, ikiVariance = 0) {
    let score = 60; // baseline

    // Typing consistency relative to baseline
    if (baselineWPM > 0 && typingWPM > 0) {
        const ratio = typingWPM / baselineWPM;
        if      (ratio >= 0.9) score += 20;
        else if (ratio >= 0.7) score += 8;
        else if (ratio >= 0.5) score -= 10;
        else                   score -= 25;
    }

    // Penalize high IKI variance (erratic typing = distracted)
    score -= Math.round(ikiVariance * 0.2);

    // Active but not frantic = focused
    if (mouseActive) {
        if      (mouseIntensity >= 20 && mouseIntensity <= 70) score += 15;
        else if (mouseIntensity > 90)                          score -= 15;
    } else {
        score += 5; // keyboard-only deep work
    }

    // Moderate cognitive load is the focus sweet spot
    if      (cognitiveLoad >= 30 && cognitiveLoad <= 65) score += 10;
    else if (cognitiveLoad > 80)                         score -= 20;

    return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Computes cognitive energy level.
 */
export function computeEnergyLevel(stressScore, fatigueScore, sessionMinutes, sleepQuality = 3.5) {
    const sleepBoost   = (sleepQuality / 5) * 25;
    const sessionDrain = Math.min(35, sessionMinutes * 0.4);
    const base = 100 - stressScore * 0.35 - fatigueScore * 0.35 + sleepBoost - sessionDrain;
    return Math.round(Math.max(0, Math.min(100, base)));
}

/**
 * Computes recovery need (how urgently the user needs a break).
 */
export function computeRecoveryNeed(stressScore, fatigueScore, cognitiveLoad, sessionMinutes) {
    const overloadPressure = stressScore * 0.35 + fatigueScore * 0.35 + cognitiveLoad * 0.20;
    const sessionPressure  = Math.min(100, sessionMinutes * 0.8);
    return Math.round(Math.min(100, overloadPressure * 0.75 + sessionPressure * 0.25));
}

/**
 * Computes complete wellness metrics object.
 * @param {Object} sensors       - Live sensor readings
 * @param {Object} baseline      - User's personal baseline
 * @param {number} burnoutRisk7d - 7-day burnout risk from personalization
 * @returns {Object} Complete wellness dimensions + rawSignals
 */
export function computeWellness(sensors, baseline, burnoutRisk7d) {
    const sessionMinutes = (Date.now() - sensors.sessionStart) / 60000;
    const sleepQuality   = getLatestSleepQuality();

    const fatigueScore = computeFatigueScore(
        sensors.eyeAspectRatio,
        sensors.blinkRate,
        sessionMinutes
    );

    const focusScore = computeFocusScore(
        sensors.typingWPM,
        baseline.typingWPM,
        sensors.mouseIntensity,
        sensors.mouseActive,
        sensors.cognitiveLoad,
        sensors.ikiVariance || 0
    );

    const energyLevel = computeEnergyLevel(
        sensors.stressLevel,
        fatigueScore,
        sessionMinutes,
        sleepQuality
    );

    const recoveryNeed = computeRecoveryNeed(
        sensors.stressLevel,
        fatigueScore,
        sensors.cognitiveLoad,
        sessionMinutes
    );

    const rawSignals = {
        timestamp:       Date.now(),
        sessionMinutes:  Math.round(sessionMinutes * 10) / 10,
        eyeAspectRatio:  sensors.eyeAspectRatio,
        blinkRate:       sensors.blinkRate,
        blinkCount:      sensors.blinkCount || 0,
        typingWPM:       sensors.typingWPM,
        ikiVariance:     sensors.ikiVariance || 0,
        errorRate:       sensors.errorRate  || 0,
        mouseIntensity:  sensors.mouseIntensity,
        mouseSpeed:      sensors.mouseSpeed  || 0,
        jerkiness:       sensors.jerkiness  || 0,
        idlePauses:      sensors.idlePauses || 0,
        headYaw:         sensors.headYaw    || 0,
        headPitch:       sensors.headPitch  || 0,
        headDistraction: sensors.headDistraction || 0,
        cognitiveLoad:   sensors.cognitiveLoad,
        stressLevel:     sensors.stressLevel,
    };

    return {
        stressScore:   sensors.stressLevel,
        fatigueScore,
        focusScore,
        cognitiveLoad: sensors.cognitiveLoad,
        burnoutRisk:   Math.round((burnoutRisk7d * 0.6 + sensors.stressLevel * 0.4)),
        recoveryNeed,
        energyLevel,
        rawSignals,
    };
}

/**
 * Gets the most recent sleep quality score from localStorage.
 * @returns {number} 1-5
 */
function getLatestSleepQuality() {
    try {
        const raw  = localStorage.getItem("mindguard_sleep_log");
        if (!raw) return 3.5;
        const log    = JSON.parse(raw);
        const recent = log.slice(-3);
        if (recent.length === 0) return 3.5;
        return recent.reduce((a, b) => a + (b.quality || 3), 0) / recent.length;
    } catch { return 3.5; }
}
