"use client";
/**
 * DemoBar.js
 * Floating banner shown when Demo Mode is active.
 * Shows profile switcher and row navigation.
 */
import { useDataset, PROFILES } from "@/context/DatasetContext";

export default function DemoBar() {
    var ds = useDataset();
    if (!ds.demoMode) return null;

    var row = ds.currentRow;
    var p = ds.profileInfo;

    return (
        <>
            <div
                className="fixed top-[52px] left-0 right-0 z-40 px-4 py-1.5 text-center"
                style={{
                    background: "rgba(127,29,29,0.95)",
                    borderBottom: "1px solid rgba(248,113,113,0.4)",
                }}
            >
                <span className="text-[11px] font-bold tracking-widest text-red-200">
                    DEMO DATA — NOT LIVE MEASUREMENTS
                </span>
                {ds.loadError && (
                    <span className="ml-3 text-[10px] text-red-300">Load error: {ds.loadError}</span>
                )}
                {!ds.loaded && !ds.loadError && (
                    <span className="ml-3 text-[10px] text-red-300">Loading dataset_results.csv…</span>
                )}
            </div>

            <div
                className="fixed bottom-0 left-0 right-0 z-50 px-4 py-2 flex flex-wrap items-center gap-3"
                style={{
                    background: "rgba(4,4,14,0.97)",
                    borderTop: "1px solid " + p.color + "40",
                }}
            >
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: p.color }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: p.color }}>
                        DEMO DATA — NOT LIVE MEASUREMENTS
                    </span>
                    <span className="text-[10px] text-gray-600">
                        Record {ds.rowIndex + 1}/{ds.profileRows.length || 0}
                    </span>
                </div>

                <div className="flex gap-1 flex-wrap">
                    {PROFILES.map(function(prof) {
                        var active = prof.id === ds.activeProfile;
                        return (
                            <button
                                key={prof.id}
                                type="button"
                                onClick={function() { ds.switchProfile(prof.id); }}
                                className="text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all"
                                style={{
                                    background: active ? prof.color + "25" : "rgba(255,255,255,0.03)",
                                    border: "1px solid " + (active ? prof.color + "60" : "rgba(255,255,255,0.06)"),
                                    color: active ? prof.color : "#4b5563",
                                }}
                            >
                                {prof.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-1 ml-auto shrink-0">
                    <button
                        type="button"
                        onClick={ds.prevRow}
                        className="text-[10px] px-2 py-1 rounded-lg text-gray-500 hover:text-white border border-white/5 hover:border-white/10 transition-all"
                    >
                        Prev Record
                    </button>
                    <button
                        type="button"
                        onClick={ds.nextRow}
                        className="text-[10px] px-2 py-1 rounded-lg text-gray-500 hover:text-white border border-white/5 hover:border-white/10 transition-all"
                    >
                        Next Record
                    </button>
                </div>

                {row && (
                    <div className="hidden lg:flex items-center gap-3 text-[10px] text-gray-600 font-mono ml-2">
                        {[
                            ["EAR", row.ear],
                            ["Blinks", row.blink_rate + "/m"],
                            ["WPM", row.typing_wpm],
                            ["Load", row.cognitive_load + "% " + row.cognitive_label],
                            ["Stress", row.stress_score + "%"],
                            ["Wellness", row.wellness_score + "%"],
                        ].map(function(pair, i) {
                            return (
                                <span key={i}>
                                    <span className="text-gray-700">{pair[0]}: </span>
                                    <span style={{ color: p.color }}>{pair[1]}</span>
                                </span>
                            );
                        })}
                    </div>
                )}

                <button
                    type="button"
                    onClick={ds.toggleDemo}
                    className="text-[10px] px-3 py-1 rounded-lg text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all shrink-0"
                >
                    Exit Demo
                </button>
            </div>
        </>
    );
}
