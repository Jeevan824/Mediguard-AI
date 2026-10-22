/**
 * GET    /api/sessions/[id] — Fetch a single session with summary stats
 * PATCH  /api/sessions/[id] — End / update a session (add final metrics)
 * DELETE /api/sessions/[id] — Delete a session and all its snapshots
 */

import { createServerClient } from "@/lib/supabase";
import {
  ok,
  notFound,
  badRequest,
  forbidden,
  noContent,
  internalError,
  requireAuth,
} from "@/lib/apiResponse";
import { endSessionSchema, parseBody } from "@/lib/validation";

// Shared helper: verify session belongs to the requesting user
async function getOwnedSession(supabase, sessionId, userId) {
  const { data, error } = await supabase
    .from("monitoring_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !data) return { error: "not_found" };
  if (data.user_id !== userId) return { error: "forbidden" };
  return { session: data };
}

// ─── GET /api/sessions/[id] ───────────────────────────────────────────────────
export async function GET(request, { params }) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { id } = await params;
  const { session, error } = await getOwnedSession(supabase, id, user.id);
  if (error === "not_found") return notFound("Session");
  if (error === "forbidden") return forbidden();

  // Also return snapshot count
  const { count } = await supabase
    .from("sensor_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id);

  return ok({ ...session, snapshot_count: count ?? 0 });
}

// ─── PATCH /api/sessions/[id] ─────────────────────────────────────────────────
export async function PATCH(request, { params }) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { id } = await params;
  const { session, error } = await getOwnedSession(supabase, id, user.id);
  if (error === "not_found") return notFound("Session");
  if (error === "forbidden") return forbidden();

  const parsed = await parseBody(request, endSessionSchema);
  if (parsed.error) return badRequest("Invalid request body");

  const { data, error: updateError } = await supabase
    .from("monitoring_sessions")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    console.error("[PATCH /api/sessions/[id]]", updateError);
    return internalError("Failed to update session");
  }

  return ok(data);
}

// ─── DELETE /api/sessions/[id] ───────────────────────────────────────────────
export async function DELETE(request, { params }) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { id } = await params;
  const { error: ownerError } = await getOwnedSession(supabase, id, user.id);
  if (ownerError === "not_found") return notFound("Session");
  if (ownerError === "forbidden") return forbidden();

  // Snapshots are deleted by CASCADE on the foreign key
  const { error } = await supabase
    .from("monitoring_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[DELETE /api/sessions/[id]]", error);
    return internalError("Failed to delete session");
  }

  return noContent();
}
