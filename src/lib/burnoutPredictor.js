/**
 * AURA AI — Burnout Prediction Model
 * Random Forest-inspired weighted decision engine running in pure JS.
 */

/**
 * @typedef {Object} BurnoutFeatures
 * @property {number} avgStress7d       - Average stress last 7 days (0-100)
 * @property {number} avgStress3d       - Average stress last 3 days (0-100)
 * @property {number} stressTrend       - Slope of stress trend (+/-)
 * @property {number} avgSleepQuality   - Average sleep quality (1-5)
 * @property {number} avgSessionLength  - Average session minutes
 * @property {number} hydrationFreq     - Avg sips per day
 * @property {number} movementBreaks    - Avg breaks per day
 * @property {number} overloadEvents    - Total overload events (cumulative)
 */

/**
 * @typedef {Object} BurnoutPrediction
 * @property {number} probability   - 0-100
 * @property {string} tier          - 'Minimal' | 'Low' | 'Moderate' | 'High' | 'Critical'
 * @property {string[]} riskFactors - Human-readable risk factors
 * @property {string[]} protective  - Protective factors present
 * @property {number} confidence    - Prediction confidence (0-100)
 */

/**
 * Computes burnout prediction from historical data.
 * @param {BurnoutFeatures} features
 * @returns {BurnoutPrediction}
 */
export function predictBurnout(features) {
    const {
        avgStress7d = 30,
        avgStress3d = 30,
        stressTrend = 0,
        avgSleepQuality = 3.5,
        avgSessionLength = 45,
        hydrationFreq = 5,
        movementBreaks = 2,
        overloadEvents = 0,
    } = features;

    let score = 0;
    const riskFactors = [];
    const protective = [];

    // --- Stress component (40% weight) ---
    if (avgStress7d > 70) { score += 40; riskFactors.push("Chronically elevated stress (7-day avg > 70)"); }
    else if (avgStress7d > 55) { score += 25; riskFactors.push("Sustained high stress levels"); }
    else if (avgStress7d > 40) { score += 12; }
    else protective.push("Stress levels within healthy range");

    // Recent acceleration
    if (avgStress3d > avgStress7d + 15) { score += 15; riskFactors.push("Stress escalating over last 3 days"); }
    if (stressTrend > 3) { score += 10; riskFactors.push("Upward stress trend detected"); }

    // --- Sleep component (25% weight) ---
    if (avgSleepQuality < 2) { score += 25; riskFactors.push("Poor sleep quality significantly increasing risk"); }
    else if (avgSleepQuality < 3) { score += 15; riskFactors.push("Below-average sleep quality"); }
    else if (avgSleepQuality >= 4) protective.push("Good sleep quality — protective factor");

    // --- Session length (15% weight) ---
    if (avgSessionLength > 120) { score += 15; riskFactors.push("Extremely long sessions (>2h) without breaks"); }
    else if (avgSessionLength > 80) { score += 8; riskFactors.push("Long sessions without adequate breaks"); }
    else if (avgSessionLength < 50) protective.push("Healthy session lengths");

    // --- Recovery behaviors (20% weight) ---
    if (movementBreaks < 1) { score += 10; riskFactors.push("No movement breaks — sedentary risk"); }
    else if (movementBreaks >= 3) protective.push("Regular movement breaks — protective");

    if (hydrationFreq < 2) { score += 5; riskFactors.push("Low hydration frequency"); }
    else if (hydrationFreq >= 6) protective.push("Good hydration habits");

    if (overloadEvents > 10) { score += 10; riskFactors.push("Frequent cognitive overload events"); }

    const probability = Math.round(Math.max(0, Math.min(100, score)));
    const dataPoints = Object.values(features).filter((v) => v !== undefined && v !== null).length;
    const confidence = Math.round(Math.min(95, 40 + dataPoints * 7));

    let tier = "Minimal";
    if (probability >= 80) tier = "Critical";
    else if (probability >= 60) tier = "High";
    else if (probability >= 40) tier = "Moderate";
    else if (probability >= 20) tier = "Low";

    return { probability, tier, riskFactors, protective, confidence };
}

/**
 * Gathers burnout features from localStorage and current session.
 * @param {number} currentStress
 * @param {number} sessionMinutes
 * @param {number} movementBreaks
 * @param {number} overloadEvents
 * @returns {BurnoutFeatures}
 */
export function gatherBurnoutFeatures(currentStress, sessionMinutes, movementBreaks, overloadEvents) {
    let avgStress7d = currentStress;
    let avgStress3d = currentStress;
    let stressTrend = 0;
    let avgSleepQuality = 3.5;
    let hydrationFreq = 5;

    try {
        // Stress history
        const stressRaw = localStorage.getItem("aura_daily_stress");
        if (stressRaw) {
            const history = JSON.parse(stressRaw);
            const last7 = history.slice(-7);
            const last3 = history.slice(-3);
            if (last7.length) avgStress7d = last7.reduce((a, b) => a + b.stress, 0) / last7.length;
            if (last3.length) avgStress3d = last3.reduce((a, b) => a + b.stress, 0) / last3.length;
            if (last7.length >= 3) {
                stressTrend = (last7[last7.length - 1].stress - last7[0].stress) / last7.length;
            }
        }

        // Sleep quality
        const sleepRaw = localStorage.getItem("mindguard_sleep_log");
        if (sleepRaw) {
            const log = JSON.parse(sleepRaw).slice(-7);
            if (log.length) avgSleepQuality = log.reduce((a, b) => a + (b.quality || 3), 0) / log.length;
        }

        // Hydration
        const hydrRaw = localStorage.getItem("mindguard_hydration");
        if (hydrRaw) {
            const data = JSON.parse(hydrRaw);
            const vals = Object.values(data).slice(-7);
            if (vals.length) hydrationFreq = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
    } catch { }

    return {
        avgStress7d: Math.round(avgStress7d),
        avgStress3d: Math.round(avgStress3d),
        stressTrend,
        avgSleepQuality,
        avgSessionLength: sessionMinutes,
        hydrationFreq,
        movementBreaks,
        overloadEvents,
    };
}
