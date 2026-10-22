"use client";
import { useAura } from "@/context/AuraContext";
import { useDataset } from "@/context/DatasetContext";
import { usePersonalization } from "@/context/PersonalizationContext";
import { useSensor } from "@/context/SensorContext";
import AuraCard, { AuraCardHeader } from "@/components/aura/AuraCard";
import { loadSleepLog } from "@/components/health/SleepTracker";
import { useMemo, useState, useEffect } from "react";

export default function ResearchPage() {
    return <ResearchContent />;
}

function ResearchContent() {
    const [sessionMins, setSessionMins] = useState(0);

    const { wellness, eventLog } = useAura();
    const { baseline } = usePersonalization();
    const sensor = useSensor();
    const { demoMode, currentRow } = useDataset();

    const sleepLog = useMemo(() => loadSleepLog(), []);
    useEffect(() => {
        const t = setInterval(() => setSessionMins(Math.floor((Date.now() - sensor.sessionStart) / 60000)), 1000);
        return () => clearInterval(t);
    }, [sensor.sessionStart]);

    const na = "n/a (not in dataset)";
    const rawMetrics = [
        { l: "Eye Aspect Ratio", v: sensor.eyeAspectRatio.toFixed(4) },
        { l: "Blink Rate", v: `${sensor.blinkRate}/min` },
        { l: "Total Blinks", v: demoMode ? `${sensor.blinkCount} (blink_rate × session_minutes)` : sensor.blinkCount },
        { l: "Typing WPM", v: sensor.typingWPM },
        { l: "Total Keystrokes", v: demoMode ? na : sensor.totalKeystrokes },
        { l: "Mouse Speed", v: demoMode ? na : `${sensor.mouseSpeed} px/s` },
        { l: "Mouse Distance", v: demoMode ? na : `${Math.round(sensor.mouseDistance)} px` },
        { l: "Mouse Clicks", v: demoMode ? na : sensor.mouseClicks },
        { l: "Mouse Active", v: sensor.mouseActive ? "Yes" : "No" },
        { l: "Mouse Intensity", v: sensor.mouseIntensity },
        { l: "Stress Level", v: sensor.stressLevel },
        { l: "Cognitive Load", v: sensor.cognitiveLoad },
        { l: "Cognitive Label", v: sensor.cognitiveLabel },
        { l: "Head Yaw / Pitch", v: demoMode ? na : `${sensor.headYaw}° / ${sensor.headPitch}°` },
        { l: "Head Distraction", v: sensor.headDistraction },
        { l: "Sleep Quality", v: demoMode && currentRow && currentRow.sleep_quality != null ? currentRow.sleep_quality : na },
        { l: "Face Detected", v: demoMode ? na : (sensor.faceLandmarks ? "Yes" : "No") },
        { l: "Overload Events", v: demoMode ? na : sensor.overloadEvents },
        { l: "Wellness Score", v: wellness.wellnessScore },
        { l: "Fatigue Score", v: wellness.fatigueScore },
        { l: "Focus Score", v: wellness.focusScore },
        { l: "Energy Level", v: wellness.energyLevel },
        { l: "Burnout Risk", v: wellness.burnoutRisk },
        { l: "Recovery Need", v: wellness.recoveryNeed },
        { l: "Baseline Blinks", v: demoMode ? na : `${Math.round(baseline.blinkRate)}/min` },
        { l: "Baseline WPM", v: demoMode ? na : Math.round(baseline.typingWPM) },
        { l: "Baseline Stress", v: demoMode ? na : Math.round(baseline.stressLevel) },
        { l: "Samples Collected", v: demoMode ? na : baseline.sampleCount },
    ];

    const exportCSV = () => {
        const header = "Timestamp,Metric,Value\n";
        const now = new Date().toISOString();
        const rows = rawMetrics.map((m) => `${now},"${m.l}","${m.v}"`).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `aura-research-${now.slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="page-container">
            <div className="page-header flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                        <span className="aura-gradient-text">Research Panel</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Raw sensor data  -  Behavioral embeddings  -  Export tools</p>
                    {demoMode && (
                        <p className="text-[11px] font-bold tracking-widest text-red-300 mt-2">DEMO DATA — NOT LIVE MEASUREMENTS</p>
                    )}
                </div>
                <button onClick={exportCSV} className="btn-secondary text-xs py-2 px-4">
                     Export CSV
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Raw sensor stream */}
                <AuraCard className="lg:col-span-2">
                    <AuraCardHeader label="Live Sensor Stream" icon="*" />
                    <div className="grid grid-cols-2 gap-1.5 max-h-80 overflow-y-auto">
                        {rawMetrics.map((m, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg odd:bg-white/[0.015]">
                                <span className="text-gray-500">{m.l}</span>
                                <span className="text-indigo-300 font-mono font-medium">{m.v}</span>
                            </div>
                        ))}
                    </div>
                </AuraCard>

                {/* Session stats */}
                <AuraCard>
                    <AuraCardHeader label="Session Statistics" icon="*" />
                    <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between"><span className="text-gray-500">Session Duration</span><span className="text-white">{sessionMins}m</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Event Log Entries</span><span className="text-white">{eventLog.length}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Sleep Log Entries</span><span className="text-white">{sleepLog.length}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Baseline Samples</span><span className="text-white">{baseline.sampleCount}</span></div>
                    </div>
                </AuraCard>

                {/* Event log */}
                <AuraCard className="lg:col-span-2">
                    <AuraCardHeader label="Event Log" icon="*" />
                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {eventLog.length === 0 ? (
                            <p className="text-xs text-gray-600 text-center py-4">No events yet</p>
                        ) : eventLog.map((e) => (
                            <div key={e.id} className="flex gap-2 text-[10px] py-0.5 border-b border-white/[0.03] last:border-0">
                                <span className="text-gray-700 font-mono shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                                <span className="px-1.5 rounded text-indigo-400 bg-indigo-500/10 shrink-0">{e.type}</span>
                                <span className="text-gray-500">{e.message}</span>
                            </div>
                        ))}
                    </div>
                </AuraCard>

                {/* Sleep log table */}
                <AuraCard>
                    <AuraCardHeader label="Sleep Log" icon=")" />
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {sleepLog.length === 0 ? (
                            <p className="text-xs text-gray-600 text-center py-4">No sleep entries</p>
                        ) : sleepLog.slice(-10).reverse().map((s, i) => (
                            <div key={i} className="text-[10px] py-1 border-b border-white/[0.03] last:border-0">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{s.date}</span>
                                    <span className="text-amber-400">{"*".repeat(s.quality || 0)}</span>
                                </div>
                                <div className="flex gap-2 mt-0.5 text-gray-600">
                                    <span>{s.duration}</span>
                                    {s.focusScore !== null && <span>Focus: {s.focusScore}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </AuraCard>
            </div>
        </div>
    );
}

