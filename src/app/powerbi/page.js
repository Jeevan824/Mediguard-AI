"use client";
import { useState, useEffect } from "react";
import { useDataset } from "@/context/DatasetContext";
import { motion, AnimatePresence } from "framer-motion";
import { useSensor } from "@/context/SensorContext";
import { useAura } from "@/context/AuraContext";
import { usePersonalization } from "@/context/PersonalizationContext";
import { getCLIBreakdown } from "@/lib/cognitiveLoad";
import { scoreToColor } from "@/config/auraTheme";
import {
    Line, Radar, Bar, Doughnut,
} from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, RadialLinearScale,
    PointElement, LineElement, BarElement, ArcElement,
    Filler, Tooltip, Legend,
} from "chart.js";

ChartJS.register(
    CategoryScale, LinearScale, RadialLinearScale,
    PointElement, LineElement, BarElement, ArcElement,
    Filler, Tooltip, Legend
);

export default function PowerBIPage() {
    return <PowerBIContent />;
}

//  Helpers 
const RAG = (v, invert = false) => {
    const s = invert ? 100 - v : v;
    if (s >= 70) return "#22c55e";
    if (s >= 40) return "#f59e0b";
    return "#ef4444";
};

const Tile = ({ label, value, unit = "", color, sub, icon, id }) => (
    <motion.div
        id={id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-4 flex flex-col gap-1"
        style={{ background: "rgba(15,15,28,0.85)", border: `1px solid ${color}30` }}
    >
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }} />
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
            <span>{icon}</span>{label}
        </div>
        <div className="text-3xl font-bold font-mono" style={{ color }}>
            {value}<span className="text-base font-normal text-gray-500 ml-1">{unit}</span>
        </div>
        {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />
    </motion.div>
);

const Panel = ({ title, icon, children, span = "", glow = "#8b5cf6", id }) => (
    <motion.div
        id={id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-4 flex flex-col gap-3 ${span}`}
        style={{
            background: "rgba(10,10,22,0.9)",
            border: `1px solid rgba(255,255,255,0.07)`,
            boxShadow: `0 0 30px ${glow}10`,
        }}
    >
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="text-base">{icon}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</span>
        </div>
        <div className="flex-1">{children}</div>
    </motion.div>
);

//  Main Content 
function PowerBIContent() {
    const sensor = useSensor();
    const { wellness, cognitiveState, stateColor } = useAura();
    const { baseline } = usePersonalization();
    const { demoMode, currentRow } = useDataset();

    // Time range filter
    const [timeRange, setTimeRange] = useState(60);   // number of last points to show
    const [showSignals, setShowSignals] = useState({
        stress: true, fatigue: true, load: true, focus: true, blink: true, wpm: true,
    });
    const [rawMode, setRawMode] = useState(false);
    const [exportMsg, setExportMsg] = useState("");

    // Load distribution tracking
    const [loadCount, setLoadCount] = useState({ Low: 0, Medium: 0, High: 0 });
    useEffect(() => {
        const bucket = sensor.cognitiveLabel || "Low";
        const t = setTimeout(() => setLoadCount((prev) => ({ ...prev, [bucket]: (prev[bucket] || 0) + 1 })), 0);
        return () => clearTimeout(t);
    }, [sensor.cognitiveLabel]);

    // Sliced history by time range
    const slice = (arr) => arr.slice(-timeRange);
    const labels = slice(sensor.timeLabels);

    //  Chart data objects 
    const stressLineData = {
        labels,
        datasets: [
            showSignals.stress && {
                label: "Stress",
                data: slice(sensor.stressHistory),
                borderColor: "#ef4444",
                backgroundColor: "#ef444415",
                fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
            },
            showSignals.fatigue && {
                label: "Fatigue",
                data: slice(sensor.loadHistory).map((_, i) => {
                    const s = sensor.stressHistory.slice(-timeRange)[i] || 0;
                    return Math.round(s * 0.8 + (sensor.blinkHistory.slice(-timeRange)[i] || 0) * 0.05);
                }),
                borderColor: "#f59e0b",
                backgroundColor: "#f59e0b10",
                fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
            },
            showSignals.load && {
                label: "Cognitive Load",
                data: slice(sensor.loadHistory),
                borderColor: "#8b5cf6",
                backgroundColor: "#8b5cf610",
                fill: false, tension: 0.4, pointRadius: 0, borderWidth: 2,
            },
            showSignals.focus && {
                label: "Focus",
                data: slice(sensor.focusHistory),
                borderColor: "#22c55e",
                backgroundColor: "#22c55e10",
                fill: false, tension: 0.4, pointRadius: 0, borderWidth: 2,
            },
        ].filter(Boolean),
    };

    const keystrokeData = {
        labels,
        datasets: [
            showSignals.wpm && {
                label: "WPM",
                data: slice(sensor.wpmHistory),
                borderColor: "#06b6d4",
                backgroundColor: "#06b6d415",
                fill: true, tension: 0.4, pointRadius: 0,
                yAxisID: "y",
            },
            showSignals.blink && {
                label: "Blink Rate",
                data: slice(sensor.blinkHistory),
                borderColor: "#a78bfa",
                backgroundColor: "#a78bfa10",
                fill: false, tension: 0.4, pointRadius: 0,
                yAxisID: "y2",
            },
        ].filter(Boolean),
    };

    const mouseData = {
        labels,
        datasets: [{
            label: "Mouse Speed",
            data: slice(sensor.mouseHistory),
            backgroundColor: "#818cf860",
            borderColor: "#818cf8",
            borderWidth: 1,
            borderRadius: 4,
        }],
    };

    const radarData = {
        labels: ["Focus", "Energy", "Low Stress", "Low Fatigue", "Low Burnout", "Recovery OK"],
        datasets: [{
            label: "Wellness",
            data: [
                wellness.focusScore,
                wellness.energyLevel,
                100 - wellness.stressScore,
                100 - wellness.fatigueScore,
                100 - wellness.burnoutRisk,
                100 - wellness.recoveryNeed,
            ],
            backgroundColor: `${stateColor}18`,
            borderColor: stateColor,
            borderWidth: 2,
            pointBackgroundColor: stateColor,
        }],
    };

    const { Low = 1, Medium = 1, High = 1 } = loadCount;
    const totalSamples = Low + Medium + High;
    const donutData = {
        labels: ["Low Load", "Medium Load", "High Load"],
        datasets: [{
            data: [Low, Medium, High],
            backgroundColor: ["#22c55e40", "#f59e0b40", "#ef444440"],
            borderColor:     ["#22c55e",   "#f59e0b",   "#ef4444"],
            borderWidth: 2,
        }],
    };

    //  Chart options 
    const lineOpts = (dualAxis = false) => ({
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: "index", intersect: false },
        plugins: {
            legend: { display: true, labels: { color: "#6b7280", boxWidth: 10, font: { size: 9 } } },
            tooltip: { backgroundColor: "#0f0f1c", titleColor: "#e8e8f0", bodyColor: "#9ca3af" },
        },
        scales: {
            x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#4b5563", font: { size: 9 }, maxTicksLimit: 8 } },
            y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#4b5563", font: { size: 9 } }, beginAtZero: true, max: 100 },
            ...(dualAxis ? {
                y2: {
                    position: "right",
                    grid: { display: false },
                    ticks: { color: "#a78bfa", font: { size: 9 } },
                    beginAtZero: true,
                },
            } : {}),
        },
    });

    const barOpts = {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#0f0f1c" } },
        scales: {
            x: { grid: { display: false }, ticks: { color: "#6b7280", font: { size: 9 }, maxTicksLimit: 8 } },
            y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#6b7280", font: { size: 9 } }, beginAtZero: true },
        },
    };

    const radarOpts = {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: { legend: { display: false } },
        scales: {
            r: {
                min: 0, max: 100,
                grid: { color: "rgba(255,255,255,0.05)" },
                ticks: { color: "#4b5563", font: { size: 9 }, backdropColor: "transparent" },
                pointLabels: { color: "#6b7280", font: { size: 9 } },
                angleLines: { color: "rgba(255,255,255,0.04)" },
            },
        },
    };

    const donutOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: "bottom", labels: { color: "#6b7280", font: { size: 9 }, boxWidth: 10, padding: 10 } },
            tooltip: { backgroundColor: "#0f0f1c" },
        },
        cutout: "65%",
    };

    //  CLI Breakdown 
    const breakdown = sensor.cliBreakdown || {};
    const cliItems  = getCLIBreakdown(breakdown);

    //  Exports 
    const handleExportCSV = () => {
        sensor.exportSessionCSV();
        setExportMsg(" CSV downloaded");
        setTimeout(() => setExportMsg(""), 2500);
    };
    const handleExportJSON = () => {
        sensor.exportSessionJSON();
        setExportMsg(" JSON downloaded");
        setTimeout(() => setExportMsg(""), 2500);
    };
    const handlePrint = () => window.print();

    const [sessionMins, setSessionMins] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setSessionMins(Math.floor((Date.now() - sensor.sessionStart) / 60000)), 1000);
        return () => clearInterval(t);
    }, [sensor.sessionStart]);
    const wellnessScore = wellness.wellnessScore ?? Math.round(
        (wellness.focusScore + wellness.energyLevel + (100 - wellness.stressScore) + (100 - wellness.fatigueScore)) / 4
    );

    return (
        <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg, #070710 0%, #0d0d1f 50%, #080818 100%)" }}>

            {/*  Header bar  */}
            <div className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between"
                style={{ background: "rgba(7,7,16,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded" style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)" }} />
                    <span className="font-bold text-sm tracking-wide" style={{ fontFamily: "'Outfit',sans-serif" }}>
                        MindGuard <span style={{ color: "#8b5cf6" }}>Power BI</span>
                    </span>
                    <span className="text-[10px] text-gray-600 border border-white/10 rounded px-1.5 py-0.5">ANALYTICS</span>
                    {demoMode && (
                        <span className="text-[10px] font-bold tracking-widest text-red-300 border border-red-500/30 rounded px-1.5 py-0.5">
                            DEMO DATA — NOT LIVE MEASUREMENTS
                            {currentRow ? ` · ${currentRow.profile} #${currentRow.row_id}` : ""}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <div className={`w-1.5 h-1.5 rounded-full ${sensor.isCameraActive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
                        {sensor.isCameraActive ? "LIVE" : "STATIC"}
                    </div>
                    {/* Export buttons */}
                    <button id="btn-export-csv" onClick={handleExportCSV}
                        className="text-[10px] px-3 py-1 rounded-lg font-medium transition-all hover:scale-105"
                        style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                         CSV
                    </button>
                    <button id="btn-export-json" onClick={handleExportJSON}
                        className="text-[10px] px-3 py-1 rounded-lg font-medium transition-all hover:scale-105"
                        style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>
                         JSON
                    </button>
                    <button id="btn-print" onClick={handlePrint}
                        className="text-[10px] px-3 py-1 rounded-lg font-medium transition-all hover:scale-105"
                        style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                        Print
                    </button>
                    <AnimatePresence>
                        {exportMsg && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-[10px] text-emerald-400">{exportMsg}</motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="flex">
                {/*  Sidebar (filters)  */}
                <div className="w-48 shrink-0 p-4 flex flex-col gap-4 border-r border-white/5" style={{ minHeight: "calc(100vh - 49px)" }}>
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 font-semibold">Time Range</div>
                        {[
                            { label: "Last 1 min",  pts: 12 },
                            { label: "Last 5 min",  pts: 60 },
                            { label: "Last 15 min", pts: 180 },
                            { label: "Full Session", pts: 720 },
                        ].map(({ label, pts }) => (
                            <button key={pts} id={`range-${pts}`} onClick={() => setTimeRange(pts)}
                                className="w-full text-left text-[11px] px-2 py-1.5 rounded-lg mb-1 transition-all"
                                style={{
                                    background: timeRange === pts ? "rgba(139,92,246,0.15)" : "transparent",
                                    color:      timeRange === pts ? "#a78bfa" : "#6b7280",
                                    border:     `1px solid ${timeRange === pts ? "rgba(139,92,246,0.3)" : "transparent"}`,
                                }}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 font-semibold">Signal Overlays</div>
                        {Object.entries(showSignals).map(([key, on]) => (
                            <label key={key} className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer mb-1.5 hover:text-gray-300 transition-colors">
                                <input type="checkbox" id={`toggle-${key}`} checked={on}
                                    onChange={() => setShowSignals(p => ({ ...p, [key]: !p[key] }))}
                                    className="w-3 h-3 accent-purple-500 rounded" />
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </label>
                        ))}
                    </div>

                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 font-semibold">View Mode</div>
                        <button id="btn-raw-mode" onClick={() => setRawMode(p => !p)}
                            className="w-full text-[11px] px-2 py-1.5 rounded-lg transition-all"
                            style={{
                                background: rawMode ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.03)",
                                color:      rawMode ? "#06b6d4" : "#6b7280",
                                border:     `1px solid ${rawMode ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.06)"}`,
                            }}>
                            {rawMode ? "Raw Signals" : "Computed"}
                        </button>
                    </div>

                    {/* Session info */}
                    <div className="mt-auto text-[10px] text-gray-700 space-y-1 border-t border-white/5 pt-3">
                        <div>Session: <span className="text-gray-500">{sessionMins}m</span></div>
                        <div>Samples: <span className="text-gray-500">{sensor.getSessionLog().length}</span></div>
                        <div>Overloads: <span className="text-red-500">{sensor.overloadEvents}</span></div>
                    </div>
                </div>

                {/*  Main content  */}
                <div className="flex-1 p-5 flex flex-col gap-5">

                    {/*  KPI tiles row  */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Tile id="kpi-wellness"  icon="*" label="Wellness"       value={wellnessScore}              unit="/100"   color={RAG(wellnessScore)}               sub={cognitiveState} />
                        <Tile id="kpi-stress"    icon="!" label="Stress"         value={wellness.stressScore ?? 0}  unit="%"      color={RAG(wellness.stressScore, true)}  sub="Live signal" />
                        <Tile id="kpi-load"      icon="*" label="Cog. Load"      value={sensor.cognitiveLoad}       unit="%"      color={RAG(sensor.cognitiveLoad, true)}  sub={sensor.cognitiveLabel} />
                        <Tile id="kpi-focus"     icon="*" label="Focus"          value={wellness.focusScore ?? 0}   unit="%"      color={RAG(wellness.focusScore)}         sub={`${sensor.typingWPM} WPM`} />
                        <Tile id="kpi-duration"  icon="" label="Session"        value={sessionMins}                unit="min"    color="#818cf8"                          sub={`${sensor.blinkCount} blinks`} />
                        <Tile id="kpi-burnout"   icon="*" label="Burnout Risk"   value={wellness.burnoutRisk ?? 0} unit="%"      color={RAG(wellness.burnoutRisk, true)}  sub="7-day risk" />
                    </div>

                    {/*  Chart grid  */}
                    <div className="grid lg:grid-cols-3 gap-4">

                        {/* Stress + Fatigue timeline " full width */}
                        <Panel id="panel-timeline" icon="*" title="Multi-Signal Timeline" span="lg:col-span-2" glow="#ef4444">
                            <div className="h-52">
                                <Line data={stressLineData} options={lineOpts()} />
                            </div>
                        </Panel>

                        {/* Wellness Radar */}
                        <Panel id="panel-radar" icon="*" title="Wellness Radar" glow={stateColor}>
                            <div className="h-52">
                                <Radar data={radarData} options={radarOpts} />
                            </div>
                        </Panel>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-4">

                        {/* Keystroke dynamics */}
                        <Panel id="panel-keystroke" icon="" title="Keystroke Dynamics" span="lg:col-span-2" glow="#06b6d4">
                            <div className="h-44">
                                <Line data={keystrokeData} options={lineOpts(true)} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                {[
                                    { l: "WPM",       v: sensor.typingWPM,                    c: "#06b6d4" },
                                    { l: "IKI Var",   v: `${sensor.ikiVariance ?? 0}%`,        c: "#f59e0b" },
                                    { l: "Error Rate",v: `${sensor.errorRate ?? 0}%`,          c: "#ef4444" },
                                ].map(({ l, v, c }) => (
                                    <div key={l} className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                                        <div className="text-base font-bold" style={{ color: c }}>{v}</div>
                                        <div className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wide">{l}</div>
                                    </div>
                                ))}
                            </div>
                        </Panel>

                        {/* Load distribution donut */}
                        <Panel id="panel-donut" icon="*" title="Load Distribution" glow="#22c55e">
                            <div className="h-44">
                                <Doughnut data={donutData} options={donutOpts} />
                            </div>
                            <div className="text-center mt-2 text-[10px] text-gray-600">
                                {Math.round((Low / totalSamples) * 100)}% Low  -  {Math.round((Medium / totalSamples) * 100)}% Med  -  {Math.round((High / totalSamples) * 100)}% High
                            </div>
                        </Panel>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">

                        {/* Mouse behavior */}
                        <Panel id="panel-mouse" icon="*" title="Mouse Behavioral Signal" glow="#818cf8">
                            <div className="h-36">
                                <Bar data={mouseData} options={barOpts} />
                            </div>
                            <div className="grid grid-cols-4 gap-2 mt-3">
                                {[
                                    { l: "Speed",    v: `${sensor.mouseSpeed}`,       c: "#818cf8" },
                                    { l: "Jerky",    v: `${sensor.jerkiness ?? 0}%`,  c: "#f59e0b" },
                                    { l: "Clicks",   v: sensor.mouseClicks,           c: "#06b6d4" },
                                    { l: "Idle Burst",v: sensor.idlePauses ?? 0,       c: "#ef4444" },
                                ].map(({ l, v, c }) => (
                                    <div key={l} className="rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                                        <div className="text-base font-bold" style={{ color: c }}>{v}</div>
                                        <div className="text-[9px] text-gray-600 mt-0.5 uppercase tracking-wide">{l}</div>
                                    </div>
                                ))}
                            </div>
                        </Panel>

                        {/* CLI Signal Breakdown */}
                        <Panel id="panel-cli" icon="*" title="CLI Signal Breakdown" glow="#8b5cf6">
                            <div className="space-y-2">
                                {cliItems.map(({ name, score, weight, desc }) => (
                                    <div key={name}>
                                        <div className="flex justify-between text-[10px] mb-0.5">
                                            <span className="text-gray-400 font-medium">{name} <span className="text-gray-700">({weight})</span></span>
                                            <span style={{ color: RAG(100 - score) }}>{score}/100</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ background: RAG(100 - score) }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${score}%` }}
                                                transition={{ duration: 0.6 }}
                                            />
                                        </div>
                                        <div className="text-[9px] text-gray-700 mt-0.5">{desc}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Head pose card */}
                            <div className="mt-4 rounded-xl p-3 grid grid-cols-3 gap-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                                {[
                                    { l: "Yaw",         v: `${sensor.headYaw ?? 0}`,           c: "#a78bfa" },
                                    { l: "Pitch",       v: `${sensor.headPitch ?? 0}`,          c: "#818cf8" },
                                    { l: "Distraction", v: `${sensor.headDistraction ?? 0}%`,    c: RAG(100 - (sensor.headDistraction ?? 0)) },
                                ].map(({ l, v, c }) => (
                                    <div key={l} className="text-center">
                                        <div className="text-sm font-bold" style={{ color: c }}>{v}</div>
                                        <div className="text-[9px] text-gray-600 mt-0.5">{l}</div>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    {/*  Raw signals table  */}
                    <AnimatePresence>
                        {rawMode && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                <Panel id="panel-raw" icon="*" title="Raw Signal Monitor" glow="#06b6d4" span="">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                                        {[
                                            { l: "EAR",       v: sensor.eyeAspectRatio.toFixed(3) },
                                            { l: "Blink/min", v: sensor.blinkRate },
                                            { l: "Blink Conf",v: `${sensor.blinkConfidence ?? 0}%` },
                                            { l: "WPM",       v: sensor.typingWPM },
                                            { l: "IKI Var",   v: `${sensor.ikiVariance ?? 0}` },
                                            { l: "Err Rate",  v: `${sensor.errorRate ?? 0}%` },
                                            { l: "Mouse Spd", v: sensor.mouseSpeed },
                                            { l: "Intensity", v: `${sensor.mouseIntensity}%` },
                                            { l: "Jerkiness", v: `${sensor.jerkiness ?? 0}%` },
                                            { l: "Idle Burst",v: sensor.idlePauses ?? 0 },
                                            { l: "Head Yaw",  v: `${sensor.headYaw ?? 0}` },
                                            { l: "Head Pitch",v: `${sensor.headPitch ?? 0}` },
                                            { l: "Head Dist", v: `${sensor.headDistraction ?? 0}%` },
                                            { l: "Cog Load",  v: `${sensor.cognitiveLoad}%` },
                                            { l: "Stress",    v: `${sensor.stressLevel}%` },
                                            { l: "Fatigue",   v: `${wellness.fatigueScore ?? 0}%` },
                                        ].map(({ l, v }) => (
                                            <div key={l} className="rounded-lg p-2 text-center" style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.1)" }}>
                                                <div className="text-xs font-mono font-bold text-cyan-400">{v}</div>
                                                <div className="text-[9px] text-gray-600 mt-0.5">{l}</div>
                                            </div>
                                        ))}
                                    </div>
                                </Panel>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/*  Footer export bar  */}
                    <div className="rounded-2xl px-5 py-3 flex items-center justify-between"
                        style={{ background: "rgba(10,10,22,0.9)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="text-[10px] text-gray-600">
                            MindGuard.ai Power BI  -  Session started {new Date(sensor.sessionStart).toLocaleTimeString()}  -  {sensor.getSessionLog().length} snapshots logged
                        </div>
                        <div className="flex gap-2">
                            <button id="btn-export-csv-2" onClick={handleExportCSV}
                                className="text-[10px] px-4 py-1.5 rounded-lg font-semibold transition-all hover:scale-105"
                                style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
                                 Export CSV
                            </button>
                            <button id="btn-export-json-2" onClick={handleExportJSON}
                                className="text-[10px] px-4 py-1.5 rounded-lg font-semibold transition-all hover:scale-105"
                                style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                                 Export JSON
                            </button>
                            <button id="btn-print-2" onClick={handlePrint}
                                className="text-[10px] px-4 py-1.5 rounded-lg font-semibold transition-all hover:scale-105"
                                style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>
                                Print Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



