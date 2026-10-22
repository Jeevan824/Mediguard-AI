"use client";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
} from "chart.js";
import { loadSleepLog } from "@/components/health/SleepTracker";
import { FEATURES } from "@/config/features";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

/**
 * Returns the last N date strings (YYYY-MM-DD) from today backwards.
 * @param {number} n
 * @returns {string[]}
 */
function lastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }
    return days;
}

/**
 * SleepCorrelationChart   dual-axis line chart comparing sleep quality vs focus score.
 * Shows last 14 days. Requires 3+ data points, otherwise shows placeholder.
 */
export default function SleepCorrelationChart() {
    if (!FEATURES.sleepTracker) return null;
    return <SleepCorrelationChartInner />;
}

function SleepCorrelationChartInner() {
    const days = useMemo(() => lastNDays(14), []);
    const log = useMemo(() => loadSleepLog(), []);

    // Map entries by date
    const byDate = useMemo(() => {
        const m = {};
        log.forEach((e) => { m[e.date] = e; });
        return m;
    }, [log]);

    const focusData = days.map((d) => byDate[d]?.focusScore ?? null);
    const qualityData = days.map((d) => byDate[d]?.quality ?? null);
    const labels = days.map((d) => d.slice(5)); // MM-DD

    const dataPointCount = log.filter((e) => e.focusScore !== null && e.quality !== null).length;

    if (dataPointCount < 3) {
        return (
            <div className="dashboard-card flex flex-col items-center justify-center min-h-[180px]">
                <span className="text-3xl mb-3">??</span>
                <p className="text-sm text-gray-400 text-center max-w-[240px]">
                    Log <span className="text-indigo-400 font-semibold">3 days</span> of sleep to see your focus correlation.
                </p>
                <p className="text-[11px] text-gray-600 mt-1">{dataPointCount}/3 entries so far</p>
            </div>
        );
    }

    const chartData = {
        labels,
        datasets: [
            {
                label: "Focus Score",
                data: focusData,
                borderColor: "#6366f1",
                backgroundColor: "rgba(99,102,241,0.08)",
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: "#6366f1",
                yAxisID: "yFocus",
                spanGaps: true,
            },
            {
                label: "Sleep Quality",
                data: qualityData,
                borderColor: "#06b6d4",
                backgroundColor: "rgba(6,182,212,0.08)",
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: "#06b6d4",
                yAxisID: "ySleep",
                spanGaps: true,
            },
        ],
    };

    /** @type {import('chart.js').ChartOptions} */
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
            legend: {
                display: true,
                labels: { color: "#9ca3af", font: { size: 10 }, boxWidth: 10 },
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        if (ctx.datasetIndex === 0) return `Focus: ${ctx.raw ?? " "}%`;
                        return `Sleep: ${ctx.raw ?? " "}/5`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: { color: "#6b7280", font: { size: 9 } },
            },
            yFocus: {
                position: "left",
                min: 0, max: 100,
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: { color: "#818cf8", font: { size: 9 }, callback: (v) => `${v}%` },
            },
            ySleep: {
                position: "right",
                min: 1, max: 5,
                grid: { drawOnChartArea: false },
                ticks: { color: "#06b6d4", font: { size: 9 }, stepSize: 1 },
            },
        },
    };

    return (
        <div className="dashboard-card">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Sleep Quality vs Focus Score
            </h3>
            <div className="h-48">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}
