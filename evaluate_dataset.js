/**
 * MindGuard.ai — Synthetic Dataset Generator + Evaluator
 *
 * Creates 200 realistic sensor snapshots across 5 behavioral profiles,
 * runs them through the exact same scoring functions used by the app,
 * and writes two files:
 *   dataset.csv        — the raw input signals
 *   dataset_results.csv — inputs + all computed scores
 */

const fs = require("fs");

// ─── Exact copies of the app scoring functions ───────────────────────────────

function calculateCognitiveLoad(blinkRate, typingWPM, ear, mouseIntensity, baselineWPM, extras) {
    const { ikiVariance = 0, errorRate = 0, headDistraction = 0, jerkiness = 0 } = extras || {};

    let blinkScore = 0;
    if      (blinkRate <= 8)  blinkScore = 90;
    else if (blinkRate <= 12) blinkScore = 60;
    else if (blinkRate <= 18) blinkScore = 15;
    else if (blinkRate <= 24) blinkScore = 30;
    else if (blinkRate <= 35) blinkScore = 55;
    else                      blinkScore = 80;

    let typingScore = 0;
    if (baselineWPM > 0 && typingWPM > 0) {
        const ratio = typingWPM / baselineWPM;
        if      (ratio >= 0.9) typingScore = 10;
        else if (ratio >= 0.7) typingScore = 30;
        else if (ratio >= 0.5) typingScore = 55;
        else if (ratio >= 0.3) typingScore = 75;
        else                   typingScore = 90;
    } else { typingScore = 15; }
    typingScore = Math.min(100, typingScore + ikiVariance * 0.3 + errorRate * 0.2);

    let earScore = 0;
    if      (ear >= 0.30) earScore = 5;
    else if (ear >= 0.26) earScore = 15;
    else if (ear >= 0.22) earScore = 40;
    else if (ear >= 0.18) earScore = 65;
    else                  earScore = 90;

    let mouseScore = Math.max(0, 100 - mouseIntensity);
    mouseScore = Math.min(100, mouseScore * 0.7 + jerkiness * 0.3);

    const headScore = headDistraction;

    const load = Math.round(
        blinkScore  * 0.25 +
        typingScore * 0.20 +
        earScore    * 0.20 +
        mouseScore  * 0.20 +
        headScore   * 0.15
    );

    const clampedLoad = Math.max(0, Math.min(100, load));
    let label = "Low";
    if      (clampedLoad >= 70) label = "High";
    else if (clampedLoad >= 40) label = "Medium";

    const stress = Math.round(
        blinkScore  * 0.35 +
        earScore    * 0.30 +
        mouseScore  * 0.15 +
        typingScore * 0.12 +
        headScore   * 0.08
    );

    return { load: clampedLoad, label, stress: Math.max(0, Math.min(100, stress)) };
}

function computeFatigueScore(ear, blinkRate, sessionMinutes) {
    let earFatigue = 0;
    if      (ear >= 0.30) earFatigue = 5;
    else if (ear >= 0.26) earFatigue = 20;
    else if (ear >= 0.22) earFatigue = 45;
    else if (ear >= 0.18) earFatigue = 70;
    else                  earFatigue = 90;

    let blinkFatigue = 0;
    if      (blinkRate < 8)  blinkFatigue = 70;
    else if (blinkRate < 12) blinkFatigue = 45;
    else if (blinkRate < 20) blinkFatigue = 10;
    else if (blinkRate < 30) blinkFatigue = 25;
    else                     blinkFatigue = 55;

    const sessionFatigue = Math.min(100, Math.pow(sessionMinutes / 60, 1.4) * 30);
    return Math.round(Math.min(100, earFatigue * 0.45 + blinkFatigue * 0.30 + sessionFatigue * 0.25));
}

function computeFocusScore(typingWPM, baselineWPM, mouseIntensity, mouseActive, cognitiveLoad, ikiVariance) {
    let score = 60;
    if (baselineWPM > 0 && typingWPM > 0) {
        const ratio = typingWPM / baselineWPM;
        if      (ratio >= 0.9) score += 20;
        else if (ratio >= 0.7) score += 8;
        else if (ratio >= 0.5) score -= 10;
        else                   score -= 25;
    }
    score -= Math.round((ikiVariance || 0) * 0.2);
    if (mouseActive) {
        if      (mouseIntensity >= 20 && mouseIntensity <= 70) score += 15;
        else if (mouseIntensity > 90)                          score -= 15;
    } else { score += 5; }
    if      (cognitiveLoad >= 30 && cognitiveLoad <= 65) score += 10;
    else if (cognitiveLoad > 80)                         score -= 20;
    return Math.round(Math.max(0, Math.min(100, score)));
}

function computeEnergyLevel(stressScore, fatigueScore, sessionMinutes, sleepQuality) {
    const sleepBoost   = (sleepQuality / 5) * 25;
    const sessionDrain = Math.min(35, sessionMinutes * 0.4);
    const base = 100 - stressScore * 0.35 - fatigueScore * 0.35 + sleepBoost - sessionDrain;
    return Math.round(Math.max(0, Math.min(100, base)));
}

function computeRecoveryNeed(stressScore, fatigueScore, cognitiveLoad, sessionMinutes) {
    const overloadPressure = stressScore * 0.35 + fatigueScore * 0.35 + cognitiveLoad * 0.20;
    const sessionPressure  = Math.min(100, sessionMinutes * 0.8);
    return Math.round(Math.min(100, overloadPressure * 0.75 + sessionPressure * 0.25));
}

function computeWellnessScore(stressScore, fatigueScore, focusScore, energyLevel, burnoutRisk, recoveryNeed) {
    const raw =
        (100 - stressScore)  * 0.25 +
        (100 - fatigueScore) * 0.20 +
        focusScore           * 0.20 +
        (100 - cogLoad)      * 0.15 +  // placeholder — computed inline below
        (100 - burnoutRisk)  * 0.10 +
        energyLevel          * 0.10;
    return Math.round(Math.max(0, Math.min(100, raw)));
}

// ─── Random helpers ───────────────────────────────────────────────────────────

function rand(min, max, decimals = 0) {
    const v = Math.random() * (max - min) + min;
    return decimals ? parseFloat(v.toFixed(decimals)) : Math.round(v);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ─── 5 Behavioral profiles ────────────────────────────────────────────────────

const PROFILES = [
    {
        name: "Focused_Healthy",
        desc: "Alert, well-rested, engaged. Normal blink rate, high WPM, low head movement.",
        ear:             [0.30, 0.38],
        blinkRate:       [14, 20],
        typingWPM:       [55, 85],
        mouseIntensity:  [30, 65],
        mouseActive:     true,
        ikiVariance:     [5, 20],
        errorRate:       [2, 10],
        headDistraction: [5, 20],
        jerkiness:       [5, 20],
        sessionMinutes:  [10, 45],
        sleepQuality:    [3.5, 5.0],
        baselineWPM:     65,
    },
    {
        name: "Mildly_Stressed",
        desc: "Moderate stress, slight typing slowdown, occasional head turns.",
        ear:             [0.26, 0.32],
        blinkRate:       [20, 30],
        typingWPM:       [40, 60],
        mouseIntensity:  [40, 75],
        mouseActive:     true,
        ikiVariance:     [20, 40],
        errorRate:       [10, 25],
        headDistraction: [20, 40],
        jerkiness:       [20, 40],
        sessionMinutes:  [30, 80],
        sleepQuality:    [2.5, 3.5],
        baselineWPM:     55,
    },
    {
        name: "Fatigued",
        desc: "Low EAR, low blink rate, slow typing, long session. Classic end-of-day fatigue.",
        ear:             [0.18, 0.24],
        blinkRate:       [6, 12],
        typingWPM:       [20, 42],
        mouseIntensity:  [10, 35],
        mouseActive:     false,
        ikiVariance:     [35, 60],
        errorRate:       [20, 40],
        headDistraction: [30, 55],
        jerkiness:       [10, 30],
        sessionMinutes:  [75, 150],
        sleepQuality:    [1.5, 2.5],
        baselineWPM:     55,
    },
    {
        name: "High_Cognitive_Load",
        desc: "Intense task. Erratic typing, frantic mouse, reduced blink rate.",
        ear:             [0.22, 0.30],
        blinkRate:       [8, 15],
        typingWPM:       [30, 55],
        mouseIntensity:  [60, 95],
        mouseActive:     true,
        ikiVariance:     [40, 70],
        errorRate:       [25, 50],
        headDistraction: [25, 55],
        jerkiness:       [50, 85],
        sessionMinutes:  [45, 120],
        sleepQuality:    [2.0, 3.5],
        baselineWPM:     60,
    },
    {
        name: "Burnout_Risk",
        desc: "Multi-day high stress, poor sleep, very long sessions, minimal breaks.",
        ear:             [0.15, 0.22],
        blinkRate:       [5, 10],
        typingWPM:       [15, 35],
        mouseIntensity:  [5, 25],
        mouseActive:     false,
        ikiVariance:     [55, 90],
        errorRate:       [35, 65],
        headDistraction: [45, 80],
        jerkiness:       [30, 65],
        sessionMinutes:  [100, 180],
        sleepQuality:    [1.0, 2.0],
        baselineWPM:     50,
    },
];

// ─── Generate rows ────────────────────────────────────────────────────────────

const ROWS_PER_PROFILE = 40; // 5 × 40 = 200 rows
const rows = [];

PROFILES.forEach((p) => {
    for (let i = 0; i < ROWS_PER_PROFILE; i++) {

        // Sample inputs from profile ranges
        const ear             = rand(p.ear[0],             p.ear[1],             3);
        const blinkRate       = rand(p.blinkRate[0],       p.blinkRate[1]);
        const typingWPM       = rand(p.typingWPM[0],       p.typingWPM[1]);
        const mouseIntensity  = rand(p.mouseIntensity[0],  p.mouseIntensity[1]);
        const mouseActive     = p.mouseActive;
        const ikiVariance     = rand(p.ikiVariance[0],     p.ikiVariance[1],     1);
        const errorRate       = rand(p.errorRate[0],       p.errorRate[1],       1);
        const headDistraction = rand(p.headDistraction[0], p.headDistraction[1]);
        const jerkiness       = rand(p.jerkiness[0],       p.jerkiness[1]);
        const sessionMinutes  = rand(p.sessionMinutes[0],  p.sessionMinutes[1]);
        const sleepQuality    = rand(p.sleepQuality[0],    p.sleepQuality[1],    1);
        const baselineWPM     = p.baselineWPM;

        // ── Compute scores using exact app functions ──────────────────────────

        const { load: cogLoad, label: cogLabel, stress: stressScore } =
            calculateCognitiveLoad(blinkRate, typingWPM, ear, mouseIntensity, baselineWPM, {
                ikiVariance, errorRate, headDistraction, jerkiness,
            });

        const fatigueScore = computeFatigueScore(ear, blinkRate, sessionMinutes);

        const focusScore = computeFocusScore(
            typingWPM, baselineWPM, mouseIntensity, mouseActive, cogLoad, ikiVariance
        );

        const energyLevel = computeEnergyLevel(stressScore, fatigueScore, sessionMinutes, sleepQuality);

        const recoveryNeed = computeRecoveryNeed(stressScore, fatigueScore, cogLoad, sessionMinutes);

        // Burnout risk (simplified — no 7-day history in dataset context)
        const burnoutRisk = Math.round(clamp(
            stressScore * 0.5 + fatigueScore * 0.3 + (sessionMinutes > 90 ? 15 : 0),
            0, 100
        ));

        // Wellness composite (same formula as AuraContext)
        const wellnessScore = Math.round(clamp(
            (100 - stressScore)  * 0.25 +
            (100 - fatigueScore) * 0.20 +
            focusScore           * 0.20 +
            (100 - cogLoad)      * 0.15 +
            (100 - burnoutRisk)  * 0.10 +
            energyLevel          * 0.10,
            0, 100
        ));

        rows.push({
            // Metadata
            profile:          p.name,
            row_id:           rows.length + 1,
            // Raw sensor inputs
            ear,
            blink_rate:       blinkRate,
            typing_wpm:       typingWPM,
            baseline_wpm:     baselineWPM,
            mouse_intensity:  mouseIntensity,
            mouse_active:     mouseActive ? 1 : 0,
            iki_variance:     ikiVariance,
            error_rate:       errorRate,
            head_distraction: headDistraction,
            jerkiness,
            session_minutes:  sessionMinutes,
            sleep_quality:    sleepQuality,
            // Computed outputs (same functions as the app)
            cognitive_load:   cogLoad,
            cognitive_label:  cogLabel,
            stress_score:     stressScore,
            fatigue_score:    fatigueScore,
            focus_score:      focusScore,
            energy_level:     energyLevel,
            recovery_need:    recoveryNeed,
            burnout_risk:     burnoutRisk,
            wellness_score:   wellnessScore,
        });
    }
});

// ─── Write CSVs ───────────────────────────────────────────────────────────────

function toCSV(arr) {
    const headers = Object.keys(arr[0]).join(",");
    const dataRows = arr.map((r) =>
        Object.values(r).map((v) => (typeof v === "string" ? `"${v}"` : v)).join(",")
    );
    return [headers, ...dataRows].join("\n");
}

// Full results CSV
fs.writeFileSync("e:/MajorPr/majorpr-app/dataset_results.csv", toCSV(rows), "utf8");

// Input-only CSV (no computed outputs — the "raw dataset")
const inputKeys = [
    "row_id","profile","ear","blink_rate","typing_wpm","baseline_wpm",
    "mouse_intensity","mouse_active","iki_variance","error_rate",
    "head_distraction","jerkiness","session_minutes","sleep_quality"
];
const inputRows = rows.map((r) => {
    const obj = {};
    inputKeys.forEach((k) => { obj[k] = r[k]; });
    return obj;
});
fs.writeFileSync("e:/MajorPr/majorpr-app/dataset.csv", toCSV(inputRows), "utf8");

// Summary stats by profile
console.log("\n=== DATASET SUMMARY ===");
console.log(`Total rows: ${rows.length}`);
console.log(`Profiles  : ${PROFILES.length} (${ROWS_PER_PROFILE} rows each)`);
console.log("");

const profiles = [...new Set(rows.map((r) => r.profile))];
profiles.forEach((p) => {
    const subset = rows.filter((r) => r.profile === p);
    const avgWellness   = Math.round(subset.reduce((a, r) => a + r.wellness_score,   0) / subset.length);
    const avgStress     = Math.round(subset.reduce((a, r) => a + r.stress_score,     0) / subset.length);
    const avgCogLoad    = Math.round(subset.reduce((a, r) => a + r.cognitive_load,   0) / subset.length);
    const avgFatigue    = Math.round(subset.reduce((r, a) => r + a.fatigue_score,    0) / subset.length);
    const avgFocus      = Math.round(subset.reduce((a, r) => a + r.focus_score,      0) / subset.length);
    const avgBurnout    = Math.round(subset.reduce((a, r) => a + r.burnout_risk,     0) / subset.length);
    const highLoad      = subset.filter((r) => r.cognitive_label === "High").length;
    const medLoad       = subset.filter((r) => r.cognitive_label === "Medium").length;
    const lowLoad       = subset.filter((r) => r.cognitive_label === "Low").length;
    console.log(`${p.padEnd(25)} | Wellness:${String(avgWellness).padStart(3)} | Stress:${String(avgStress).padStart(3)} | CogLoad:${String(avgCogLoad).padStart(3)} | Fatigue:${String(avgFatigue).padStart(3)} | Focus:${String(avgFocus).padStart(3)} | Burnout:${String(avgBurnout).padStart(3)} | Load[L/M/H]: ${lowLoad}/${medLoad}/${highLoad}`);
});

console.log("\nFiles written:");
console.log("  dataset.csv         (200 rows, inputs only)");
console.log("  dataset_results.csv (200 rows, inputs + all computed scores)");