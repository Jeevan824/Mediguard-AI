/**
 * POST /api/sessions/[id]/snapshots — Bulk-insert sensor snapshots for a session
 * GET  /api/sessions/[id]/snapshots — Retrieve snapshots for a session (paginated)
 */

import { createServerClient } from "@/lib/supabase";
import {
  ok,
  created,
  badRequest,
  notFound,
  forbidden,
  internalError,
  requireAuth,
} from "@/lib/apiResponse";
import { createSnapshotsBatchSchema, parseBody } from "@/lib/validation";

// ─── POST /api/sessions/[id]/snapshots ───────────────────────────────────────
export async function POST(request, { params }) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { id: sessionId } = await params;

  // Verify session ownership
  const { data: session, error: sessionError } = await supabase
    .from("monitoring_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) return notFound("Session");
  if (session.user_id !== user.id) return forbidden();

  const parsed = await parseBody(request, createSnapshotsBatchSchema);
  if (parsed.error) {
    return badRequest(
      parsed.error instanceof Error
        ? parsed.error.message
        : "Invalid snapshots payload"
    );
  }

  const rows = parsed.data.snapshots.map((s) => ({
    ...s,
    session_id: sessionId,
  }));

  const { data, error } = await supabase
    .from("sensor_snapshots")
    .insert(rows)
    .select("id, timestamp");

  if (error) {
    console.error("[POST /api/sessions/[id]/snapshots]", error);
    return internalError("Failed to insert snapshots");
  }

  return created({ inserted: data.length, snapshots: data });
}

// ─── GET /api/sessions/[id]/snapshots ─────────────────────────────────────────
export async function GET(request, { params }) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { id: sessionId } = await params;

  // Verify session ownership
  const { data: session, error: sessionError } = await supabase
    .from("monitoring_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) return notFound("Session");
  if (session.user_id !== user.id) return forbidden();

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10)));
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("sensor_snapshots")
    .select("*", { count: "exact" })
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[GET /api/sessions/[id]/snapshots]", error);
    return internalError("Failed to fetch snapshots");
  }

  return ok({
    snapshots: data,
    pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
  });
}
