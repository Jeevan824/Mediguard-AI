/**
 * POST /api/sessions       — Start a new monitoring session
 * GET  /api/sessions       — List the authenticated user's sessions (paginated)
 */

import { createServerClient } from "@/lib/supabase";
import {
  ok,
  created,
  badRequest,
  internalError,
  requireAuth,
} from "@/lib/apiResponse";
import { createSessionSchema, parseBody } from "@/lib/validation";

// ─── POST /api/sessions ───────────────────────────────────────────────────────
export async function POST(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const parsed = await parseBody(request, createSessionSchema);
  if (parsed.error) return badRequest("Invalid request body");

  const { data, error } = await supabase
    .from("monitoring_sessions")
    .insert({
      user_id: user.id,
      started_at: parsed.data.started_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/sessions]", error);
    return internalError("Failed to create session");
  }

  return created(data);
}

// ─── GET /api/sessions ────────────────────────────────────────────────────────
export async function GET(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("monitoring_sessions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[GET /api/sessions]", error);
    return internalError("Failed to fetch sessions");
  }

  return ok({
    sessions: data,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit),
    },
  });
}
