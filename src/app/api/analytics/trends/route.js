/**
 * GET /api/analytics/trends
 *
 * Returns time-series trend data for charting:
 * - Daily average wellness, stress, focus per session over the last N days
 * - Daily sleep quality
 * Suitable for line charts in the analytics and Power BI pages.
 */

import { createServerClient } from "@/lib/supabase";
import { ok, badRequest, internalError, requireAuth } from "@/lib/apiResponse";

export async function GET(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get("days") ?? "30", 10)));

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  // Daily session averages
  const { data: sessions, error: sessionError } = await supabase
    .from("monitoring_sessions")
    .select(
      "started_at, wellness_score, average_stress, average_fatigue, average_focus, average_energy, average_burnout_risk, average_cognitive_load"
    )
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .gte("started_at", sinceStr)
    .order("started_at", { ascending: true });

  // Daily sleep quality
  const { data: sleep, error: sleepError } = await supabase
    .from("sleep_records")
    .select("sleep_date, sleep_quality")
    .eq("user_id", user.id)
    .gte("sleep_date", since.toISOString().slice(0, 10))
    .order("sleep_date", { ascending: true });

  if (sessionError || sleepError) {
    console.error("[GET /api/analytics/trends]", sessionError || sleepError);
    return internalError("Failed to fetch trend data");
  }

  // Group sessions by date (YYYY-MM-DD), compute daily averages
  const byDate = {};
  for (const s of sessions ?? []) {
    const date = s.started_at.slice(0, 10);
    if (!byDate[date]) {
      byDate[date] = { date, sessions: [] };
    }
    byDate[date].sessions.push(s);
  }

  function mean(arr) {
    const vals = arr.filter((v) => v !== null && v !== undefined);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  const sessionTrends = Object.values(byDate).map(({ date, sessions: ss }) => ({
    date,
    session_count: ss.length,
    avg_wellness: mean(ss.map((s) => s.wellness_score)),
    avg_stress: mean(ss.map((s) => s.average_stress)),
    avg_fatigue: mean(ss.map((s) => s.average_fatigue)),
    avg_focus: mean(ss.map((s) => s.average_focus)),
    avg_energy: mean(ss.map((s) => s.average_energy)),
    avg_burnout_risk: mean(ss.map((s) => s.average_burnout_risk)),
    avg_cognitive_load: mean(ss.map((s) => s.average_cognitive_load)),
  }));

  const sleepTrends = (sleep ?? []).map((r) => ({
    date: r.sleep_date,
    sleep_quality: r.sleep_quality,
  }));

  return ok({
    days,
    session_trends: sessionTrends,
    sleep_trends: sleepTrends,
  });
}
