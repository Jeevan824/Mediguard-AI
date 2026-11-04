/**
 * @fileoverview useSessionPersistence — MindGuard.ai
 *
 * Transparently persists monitoring session data to Supabase while the
 * dashboard is open. Three phases:
 *
 *  1. On mount   — POST /api/sessions  → creates a DB session row.
 *  2. Every 5s   — accumulates one snapshot into a local pending buffer.
 *  3. Every 30s  — POST /api/sessions/[id]/snapshots  bulk-flushes buffer.
 *  4. On unmount — flush remaining + PATCH /api/sessions/[id] with averages.
 *
 * If the user is not authenticated the hook silently becomes a no-op —
 * the dashboard still works, data is just not persisted to Supabase.
 */

"use client";
import { useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { useSensor } from "@/context/SensorContext";
import { useAura } from "@/context/AuraContext";

/** How often to flush accumulated snapshots to the API. */
const FLUSH_INTERVAL_MS  = 30_000; // 30 s
/** How often to sample a snapshot into the pending buffer. */
const SAMPLE_INTERVAL_MS =  5_000; // 5 s

/**
 * Build a single snapshot row that matches the Zod `snapshotSchema` in
 * validation.js — all fields clamped to their valid ranges.
 */
function buildSnapshot(sensor, wellness) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
    return {
        timestamp:         new Date().toISOString(),
        ear:               clamp(sensor.eyeAspectRatio,  0,   1),
        blink_rate:        clamp(sensor.blinkRate,        0, 300),
        head_yaw:          clamp(sensor.headYaw,        -90,  90),
        head_pitch:        clamp(sensor.headPitch,      -90,  90),
        distraction_score: clamp(sensor.headDistraction, 0,  100),
        typing_wpm:        clamp(sensor.typingWPM,       0, 300),
        iki_variance:      clamp(sensor.ikiVariance,     0,  100),
        typing_error_rate: clamp(sensor.errorRate,       0,  100),
        mouse_speed:       clamp(sensor.mouseSpeed,      0, 9999),
        mouse_intensity:   clamp(sensor.mouseIntensity,  0,  100),
        mouse_jerkiness:   clamp(sensor.jerkiness,       0,  100),
        idle_duration:     clamp(sensor.idlePauses,      0, 9999),
        cognitive_load:    clamp(sensor.cognitiveLoad,   0,  100),
        stress:            clamp(sensor.stressLevel,     0,  100),
        fatigue:           clamp(wellness.fatigueScore,  0,  100),
        focus:             clamp(wellness.focusScore,    0,  100),
        energy:            clamp(wellness.energyLevel,   0,  100),
        recovery_need:     clamp(wellness.recoveryNeed,  0,  100),
        wellness_score:    clamp(wellness.wellnessScore, 0,  100),
    };
}

/** Numeric average of an array; 0 for empty arrays. */
function avg(arr) {
    if (!arr.length) return 0;
    return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
}

export function useSessionPersistence() {
    const sensor      = useSensor();
    const { wellness } = useAura();

    // Keep live refs so setInterval callbacks always see current values
    const sensorRef   = useRef(sensor);
    const wellnessRef = useRef(wellness);
    useEffect(() => { sensorRef.current   = sensor;  }, [sensor]);
    useEffect(() => { wellnessRef.current = wellness; }, [wellness]);

    // Lifecycle / accumulation refs — stable across renders
    const sessionIdRef     = useRef(null);
    const isActiveRef      = useRef(false);
    const pendingRef       = useRef([]);          // snapshots not yet flushed
    const sampleTimerRef   = useRef(null);
    const flushTimerRef    = useRef(null);

    // Per-dimension history for session-end averages
    const hist = useRef({
        load:     [],
        stress:   [],
        fatigue:  [],
        focus:    [],
        energy:   [],
        recovery: [],
        burnout:  [],
        wellness: [],
    });

    useEffect(() => {
        const supabase = createBrowserClient();
        let mounted = true;

        // ── Flush helper ──────────────────────────────────────────────────────
        async function flushSnapshots(sid, keepalive = false) {
            const batch = pendingRef.current.splice(0);
            if (!batch.length) return;
            try {
                const res = await fetch(`/api/sessions/${sid}/snapshots`, {
                    method:    "POST",
                    headers:   { "Content-Type": "application/json" },
                    body:      JSON.stringify({ snapshots: batch }),
                    keepalive,
                });
                if (!res.ok) {
                    // Put snapshots back so they're retried on next flush
                    pendingRef.current.unshift(...batch);
                    console.warn("[SessionPersistence] Snapshot flush failed:", res.status);
                }
            } catch (err) {
                pendingRef.current.unshift(...batch);
                console.warn("[SessionPersistence] Snapshot flush error:", err);
            }
        }

        // ── End-session helper ────────────────────────────────────────────────
        async function endSession(sid, keepalive = false) {
            const h   = hist.current;
            const now = Date.now();
            const durationSec = Math.max(
                0,
                Math.round((now - (sensorRef.current.sessionStart || now)) / 1000)
            );
            const body = {
                ended_at:               new Date(now).toISOString(),
                duration_seconds:       durationSec,
                average_cognitive_load: avg(h.load),
                average_stress:         avg(h.stress),
                average_fatigue:        avg(h.fatigue),
                average_focus:          avg(h.focus),
                average_energy:         avg(h.energy),
                average_recovery_need:  avg(h.recovery),
                average_burnout_risk:   avg(h.burnout),
                wellness_score:         avg(h.wellness),
            };
            try {
                await fetch(`/api/sessions/${sid}`, {
                    method:    "PATCH",
                    headers:   { "Content-Type": "application/json" },
                    body:      JSON.stringify(body),
                    keepalive,
                });
            } catch (err) {
                console.warn("[SessionPersistence] Session end error:", err);
            }
        }

        // ── Main init ─────────────────────────────────────────────────────────
        async function init() {
            // Check auth — silent no-op if not logged in
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !mounted) return;

            // 1. Create a DB session
            let sessionId;
            try {
                const res = await fetch("/api/sessions", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ started_at: new Date().toISOString() }),
                });
                if (!res.ok) {
                    console.warn("[SessionPersistence] Session create failed:", res.status);
                    return;
                }
                const json = await res.json();
                sessionId = json?.data?.id;
                if (!sessionId) {
                    console.warn("[SessionPersistence] No session id in response");
                    return;
                }
            } catch (err) {
                console.warn("[SessionPersistence] Session create error:", err);
                return;
            }

            sessionIdRef.current = sessionId;
            isActiveRef.current  = true;

            // 2. Sample a snapshot every 5 s
            sampleTimerRef.current = setInterval(() => {
                if (!mounted) return;
                const s = sensorRef.current;
                const w = wellnessRef.current;
                const snap = buildSnapshot(s, w);
                pendingRef.current.push(snap);

                // Accumulate for end-of-session averages (cap at 720 entries)
                const h = hist.current;
                const push = (arr, v) => { arr.push(v); if (arr.length > 720) arr.shift(); };
                push(h.load,     snap.cognitive_load);
                push(h.stress,   snap.stress);
                push(h.fatigue,  snap.fatigue);
                push(h.focus,    snap.focus);
                push(h.energy,   snap.energy);
                push(h.recovery, snap.recovery_need);
                push(h.burnout,  Number(w.burnoutRisk) || 0);
                push(h.wellness, snap.wellness_score);
            }, SAMPLE_INTERVAL_MS);

            // 3. Flush accumulated snapshots every 30 s
            flushTimerRef.current = setInterval(async () => {
                if (!mounted) return;
                await flushSnapshots(sessionId);
            }, FLUSH_INTERVAL_MS);
        }

        init();

        // ── Cleanup: flush remainder + end session ───────────────────────────
        return () => {
            mounted = false;
            clearInterval(sampleTimerRef.current);
            clearInterval(flushTimerRef.current);

            if (isActiveRef.current && sessionIdRef.current) {
                const sid = sessionIdRef.current;
                // Fire-and-forget with keepalive so it survives page navigation
                const finish = async () => {
                    await flushSnapshots(sid, true);
                    await endSession(sid, true);
                };
                finish();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally runs once on mount
}
