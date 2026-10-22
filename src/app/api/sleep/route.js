/**
 * POST /api/sleep   — Create a sleep record
 * GET  /api/sleep   — List sleep records (last 30 days by default)
 */

import { createServerClient } from "@/lib/supabase";
import {
  ok,
  created,
  badRequest,
  conflict,
  internalError,
  requireAuth,
} from "@/lib/apiResponse";
import { createSleepRecordSchema, parseBody } from "@/lib/validation";

// ─── POST /api/sleep ─────────────────────────────────────────────────────────
export async function POST(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const parsed = await parseBody(request, createSleepRecordSchema);
  if (parsed.error) return badRequest("Invalid sleep record data");

  // Check for duplicate date
  const { data: existing } = await supabase
    .from("sleep_records")
    .select("id")
    .eq("user_id", user.id)
    .eq("sleep_date", parsed.data.sleep_date)
    .single();

  if (existing) {
    return conflict(
      `A sleep record for ${parsed.data.sleep_date} already exists. Use PATCH to update it.`
    );
  }

  const { data, error } = await supabase
    .from("sleep_records")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/sleep]", error);
    return internalError("Failed to create sleep record");
  }

  return created(data);
}

// ─── GET /api/sleep ──────────────────────────────────────────────────────────
export async function GET(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10)));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("sleep_records")
    .select("*")
    .eq("user_id", user.id)
    .gte("sleep_date", since.toISOString().slice(0, 10))
    .order("sleep_date", { ascending: false });

  if (error) {
    console.error("[GET /api/sleep]", error);
    return internalError("Failed to fetch sleep records");
  }

  return ok(data);
}
