/**
 * datasetLoader.js
 * Parses dataset_results.csv (bundled at build time via import) and
 * returns an array of typed row objects.
 *
 * Each row matches exactly the fields produced by evaluate_dataset.js.
 */

// ── Raw CSV inline (generated from dataset_results.csv) ──────────────────────
// We embed the data directly so it works in the browser without a fetch.
// Re-generate by running: node evaluate_dataset.js

let _cache = null;

export function loadDatasetRows() {
    if (_cache) return _cache;
    if (typeof window === "undefined") return [];

    try {
        const raw = window.__MINDGUARD_DATASET__;
        if (!raw) return [];
        const lines = raw.trim().split("\n");
        const headers = lines[0].split(",").map(function(h) { return h.trim().replace(/^"|"$/g, ""); });
        _cache = lines.slice(1).map(function(line) {
            const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
            const row = {};
            headers.forEach(function(h, i) {
                const v = (vals[i] || "").replace(/^"|"$/g, "").trim();
                row[h] = isNaN(v) || v === "" ? v : parseFloat(v);
            });
            return row;
        });
        return _cache;
    } catch (e) {
        console.error("[datasetLoader]", e);
        return [];
    }
}

export const PROFILES = [
    "Focused_Healthy",
    "Mildly_Stressed",
    "Fatigued",
    "High_Cognitive_Load",
    "Burnout_Risk",
];

export const PROFILE_LABELS = {
    "Focused_Healthy":    "Focused & Healthy",
    "Mildly_Stressed":    "Mildly Stressed",
    "Fatigued":           "Fatigued",
    "High_Cognitive_Load":"High Cognitive Load",
    "Burnout_Risk":       "Burnout Risk",
};

export const PROFILE_COLORS = {
    "Focused_Healthy":    "#22c55e",
    "Mildly_Stressed":    "#f59e0b",
    "Fatigued":           "#f97316",
    "High_Cognitive_Load":"#818cf8",
    "Burnout_Risk":       "#ef4444",
};

/**
 * Returns a random row for the given profile, or a random row overall.
 * @param {string|null} profile
 * @returns {Object|null}
 */
export function getSampleRow(profile) {
    const rows = loadDatasetRows();
    const pool = profile ? rows.filter(function(r) { return r.profile === profile; }) : rows;
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Returns all rows for a given profile.
 * @param {string} profile
 * @returns {Object[]}
 */
export function getProfileRows(profile) {
    return loadDatasetRows().filter(function(r) { return r.profile === profile; });
}

/**
 * Returns per-profile average stats for the summary table.
 */
export function getProfileStats() {
    const rows = loadDatasetRows();
    return PROFILES.map(function(p) {
        const subset = rows.filter(function(r) { return r.profile === p; });
        if (subset.length === 0) return { profile: p, count: 0 };
        function avg(key) {
            return Math.round(subset.reduce(function(a, r) { return a + (r[key] || 0); }, 0) / subset.length);
        }
        return {
            profile:        p,
            count:          subset.length,
            wellness:       avg("wellness_score"),
            stress:         avg("stress_score"),
            cognitive_load: avg("cognitive_load"),
            fatigue:        avg("fatigue_score"),
            focus:          avg("focus_score"),
            burnout:        avg("burnout_risk"),
            energy:         avg("energy_level"),
        };
    });
}