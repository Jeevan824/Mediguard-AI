/**
 * GET /api/analytics/summary
 *
 * Returns aggregated wellness summary for the authenticated user.
 * Includes: lifetime totals, last-7-days averages, trend vs previous 7 days.
 */

import { createServerClient } from "@/lib/supabase";
import { ok, internalError, requireAuth } from "@/lib/apiResponse";

export async function GET() {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const now = new Date();
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);
  const d14 = new Date(now);
  d14.setDate(d14.getDate() - 14);

  // Sessions in last 7 days
  const { data: last7, error: e1 } = await supabase
    .from("monitoring_sessions")
    .select(
      "duration_seconds, average_cognitive_load, average_stress, average_fatigue, average_focus, average_energy, average_burnout_risk, wellness_score"
    )
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .gte("started_at", d7.toISOString());

  // Sessions in previous 7 days (for trend)
  const { data: prev7, error: e2 } = await supabase
    .from("monitoring_sessions")
    .select(
      "duration_seconds, average_cognitive_load, average_stress, average_fatigue, average_focus, average_energy, average_burnout_risk, wellness_score"
    )
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .gte("started_at", d14.toISOString())
    .lt("started_at", d7.toISOString());

  // All-time total session count and total duration
  const { count: totalSessions } = await supabase
    .from("monitoring_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  // Sleep summary (last 14 days)
  const { data: sleepLast14 } = await supabase
    .from("sleep_records")
    .select("sleep_quality, sleep_duration")
    .eq("user_id", user.id)
    .gte("sleep_date", d14.toISOString().slice(0, 10));

  if (e1 || e2) {
    console.error("[GET /api/analytics/summary]", e1 || e2);
    return internalError("Failed to compute analytics summary");
  }

  function avg(arr, key) {
    if (!arr || arr.length === 0) return null;
    const vals = arr.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  function totalSeconds(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, r) => a + (r.duration_seconds ?? 0), 0);
  }

  const current = {
    session_count: last7?.length ?? 0,
    total_hours: Math.round(totalSeconds(last7) / 3600 * 10) / 10,
    avg_wellness: avg(last7, "wellness_score"),
    avg_stress: avg(last7, "average_stress"),
    avg_fatigue: avg(last7, "average_fatigue"),
    avg_focus: avg(last7, "average_focus"),
    avg_energy: avg(last7, "average_energy"),
    avg_burnout_risk: avg(last7, "average_burnout_risk"),
    avg_cognitive_load: avg(last7, "average_cognitive_load"),
  };

  const previous = {
    session_count: prev7?.length ?? 0,
    total_hours: Math.round(totalSeconds(prev7) / 3600 * 10) / 10,
    avg_wellness: avg(prev7, "wellness_score"),
    avg_stress: avg(prev7, "average_stress"),
    avg_focus: avg(prev7, "average_focus"),
  };

  // Delta (positive = improved, for wellness/focus; negative = improved, for stress)
  const delta = {
    wellness: current.avg_wellness !== null && previous.avg_wellness !== null
      ? current.avg_wellness - previous.avg_wellness : null,
    stress: current.avg_stress !== null && previous.avg_stress !== null
      ? current.avg_stress - previous.avg_stress : null,
    focus: current.avg_focus !== null && previous.avg_focus !== null
      ? current.avg_focus - previous.avg_focus : null,
  };

  const sleepAvgQuality = sleepLast14 && sleepLast14.length > 0
    ? Math.round(sleepLast14.reduce((a, r) => a + r.sleep_quality, 0) / sleepLast14.length * 10) / 10
    : null;

  return ok({
    period: "last_7_days",
    total_sessions_all_time: totalSessions ?? 0,
    current,
    previous,
    delta,
    sleep: {
      records_last_14_days: sleepLast14?.length ?? 0,
      avg_quality_last_14_days: sleepAvgQuality,
    },
  });
}
