"use client";
/**
 * DatasetContext.js
 *
 * Manages Demo Mode: loads dataset_results.csv from /public,
 * lets the user pick a profile, and injects example values
 * into SensorContext + AuraContext so every page shows the same record.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSensor } from "@/context/SensorContext";
import { useAura } from "@/context/AuraContext";

const DatasetContext = createContext(null);
const STORAGE_KEY = "mindguard_demo_state";

export const PROFILES = [
    { id: "Focused_Healthy",    label: "Focused & Healthy",    color: "#22c55e" },
    { id: "Mildly_Stressed",    label: "Mildly Stressed",       color: "#f59e0b" },
    { id: "Fatigued",           label: "Fatigued",              color: "#f97316" },
    { id: "High_Cognitive_Load",label: "High Cognitive Load",   color: "#818cf8" },
    { id: "Burnout_Risk",       label: "Burnout Risk",          color: "#ef4444" },
];

function num(v, fallback) {
    if (v === null || v === undefined || v === "") return fallback;
    var n = Number(v);
    return Number.isNaN(n) ? fallback : n;
}

function parseCSV(text) {
    var lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    var headers = lines[0].split(",").map(function(h) { return h.replace(/"/g, "").trim(); });
    return lines.slice(1).filter(function(line) { return line.trim(); }).map(function(line) {
        var vals = [];
        var cur = "";
        var inQ = false;
        for (var i = 0; i < line.length; i++) {
            if (line[i] === '"') { inQ = !inQ; continue; }
            if (line[i] === "," && !inQ) { vals.push(cur); cur = ""; continue; }
            cur += line[i];
        }
        vals.push(cur);
        var row = {};
        headers.forEach(function(h, i) {
            var v = (vals[i] || "").trim();
            row[h] = (v !== "" && !isNaN(v)) ? parseFloat(v) : v;
        });
        return row;
    });
}

function readStored() {
    try {
        var raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

export function DatasetProvider({ children }) {
    const sensor = useSensor();
    const { updateWellness } = useAura();

    const [rows, setRows] = useState([]);
    const [demoMode, setDemoMode] = useState(false);
    const [activeProfile, setActiveProfile] = useState("Focused_Healthy");
    const [currentRow, setCurrentRow] = useState(null);
    const [rowIndex, setRowIndex] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const restoredRef = useRef(false);

    const sensorRef = useRef(sensor);
    sensorRef.current = sensor;
    const updateWellnessRef = useRef(updateWellness);
    updateWellnessRef.current = updateWellness;

    useEffect(function() {
        if (restoredRef.current) return;
        restoredRef.current = true;
        var stored = readStored();
        if (!stored) return;
        if (stored.activeProfile) setActiveProfile(stored.activeProfile);
        if (typeof stored.rowIndex === "number") setRowIndex(stored.rowIndex);
        if (stored.demoMode) setDemoMode(true);
    }, []);

    useEffect(function() {
        fetch("/dataset_results.csv")
            .then(function(r) {
                if (!r.ok) throw new Error("HTTP " + r.status + " loading /dataset_results.csv");
                return r.text();
            })
            .then(function(text) {
                if (!text || text.indexOf("profile") === -1) {
                    throw new Error("CSV missing header or empty.");
                }
                var parsed = parseCSV(text);
                if (!parsed.length) throw new Error("CSV parsed with 0 rows.");
                setRows(parsed);
                setLoaded(true);
                setLoadError(null);
            })
            .catch(function(e) {
                console.error("[DatasetContext] fetch failed", e);
                setLoadError(e && e.message ? e.message : String(e));
                setLoaded(false);
            });
    }, []);

    useEffect(function() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                demoMode: demoMode,
                activeProfile: activeProfile,
                rowIndex: rowIndex,
            }));
        } catch (e) { /* ignore quota */ }
    }, [demoMode, activeProfile, rowIndex]);

    var profileRows = rows.filter(function(r) { return r.profile === activeProfile; });

    var injectRow = useCallback(function(row) {
        if (!row) return;
        setCurrentRow(row);
        var s = sensorRef.current;

        // Fields present in dataset_results.csv
        s.setEyeAspectRatio(num(row.ear, 0));
        s.setBlinkRate(num(row.blink_rate, 0));
        // blinkCount is not in the CSV; document as blink_rate * session_minutes
        s.setBlinkCount(Math.round(num(row.blink_rate, 0) * num(row.session_minutes, 0)));
        s.setTypingWPM(num(row.typing_wpm, 0));
        s.setIkiVariance(num(row.iki_variance, 0));
        s.setErrorRate(num(row.error_rate, 0));
        s.setMouseIntensity(num(row.mouse_intensity, 0));
        s.setMouseActive(num(row.mouse_active, 0) === 1);
        s.setJerkiness(num(row.jerkiness, 0));
        s.setHeadDistraction(num(row.head_distraction, 0));
        // head yaw/pitch are not in the CSV; leave as 0 (unavailable)
        s.setHeadYaw(0);
        s.setHeadPitch(0);
        s.setCognitiveLoad(num(row.cognitive_load, 0));
        s.setCognitiveLabel(row.cognitive_label || "Low");
        s.setStressLevel(num(row.stress_score, 0));
        // Not in CSV — do not invent live mouse kinematics
        s.setMouseSpeed(0);
        s.setMouseDistance(0);
        s.setMouseClicks(0);

        s.pushChartData(
            num(row.blink_rate, 0),
            num(row.typing_wpm, 0),
            num(row.mouse_intensity, 0),
            num(row.stress_score, 0),
            num(row.cognitive_load, 0),
            num(row.ear, 0),
            num(row.focus_score, 0)
        );

        updateWellnessRef.current({
            stressScore:   num(row.stress_score, 0),
            fatigueScore:  num(row.fatigue_score, 0),
            focusScore:    num(row.focus_score, 0),
            cognitiveLoad: num(row.cognitive_load, 0),
            burnoutRisk:   num(row.burnout_risk, 0),
            recoveryNeed:  num(row.recovery_need, 0),
            energyLevel:   num(row.energy_level, 0),
            wellnessScore: num(row.wellness_score, 0),
        });
    }, []);

    useEffect(function() {
        if (!demoMode || !loaded || profileRows.length === 0) return;
        var idx = Math.min(rowIndex, profileRows.length - 1);
        if (idx < 0) idx = 0;
        setRowIndex(idx);
        injectRow(profileRows[idx]);
    }, [demoMode, activeProfile, loaded, profileRows.length, injectRow]); // eslint-disable-line react-hooks/exhaustive-deps

    var nextRow = useCallback(function() {
        if (profileRows.length === 0) return;
        var next = (rowIndex + 1) % profileRows.length;
        setRowIndex(next);
        injectRow(profileRows[next]);
    }, [profileRows, rowIndex, injectRow]);

    var prevRow = useCallback(function() {
        if (profileRows.length === 0) return;
        var prev = (rowIndex - 1 + profileRows.length) % profileRows.length;
        setRowIndex(prev);
        injectRow(profileRows[prev]);
    }, [profileRows, rowIndex, injectRow]);

    var toggleDemo = useCallback(function() {
        setDemoMode(function(v) { return !v; });
    }, []);

    var switchProfile = useCallback(function(profileId) {
        setActiveProfile(profileId);
        setRowIndex(0);
    }, []);

    var profileInfo = PROFILES.find(function(p) { return p.id === activeProfile; }) || PROFILES[0];

    return (
        <DatasetContext.Provider value={{
            demoMode, toggleDemo,
            activeProfile, switchProfile,
            profileInfo,
            currentRow, rowIndex,
            profileRows,
            nextRow, prevRow,
            loaded,
            loadError,
            totalRows: rows.length,
        }}>
            {children}
        </DatasetContext.Provider>
    );
}

export function useDataset() {
    var ctx = useContext(DatasetContext);
    if (!ctx) throw new Error("useDataset must be used within DatasetProvider");
    return ctx;
}
