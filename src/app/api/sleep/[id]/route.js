/**
 * PATCH  /api/sleep/[id] — Update a sleep record
 * DELETE /api/sleep/[id] — Delete a sleep record
 */

import { createServerClient } from "@/lib/supabase";
import {
  ok,
  badRequest,
  notFound,
  forbidden,
  noContent,
  internalError,
  requireAuth,
} from "@/lib/apiResponse";
import { updateSleepRecordSchema, parseBody } from "@/lib/validation";

// ─── PATCH /api/sleep/[id] ───────────────────────────────────────────────────
export async function PATCH(request, { params }) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { id } = await params;

  // Verify ownership
  const { data: record } = await supabase
    .from("sleep_records")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!record) return notFound("Sleep record");
  if (record.user_id !== user.id) return forbidden();

  const parsed = await parseBody(request, updateSleepRecordSchema);
  if (parsed.error) return badRequest("Invalid sleep record data");

  const { data, error } = await supabase
    .from("sleep_records")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/sleep/[id]]", error);
    return internalError("Failed to update sleep record");
  }

  return ok(data);
}

// ─── DELETE /api/sleep/[id] ──────────────────────────────────────────────────
export async function DELETE(request, { params }) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { id } = await params;

  const { data: record } = await supabase
    .from("sleep_records")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!record) return notFound("Sleep record");
  if (record.user_id !== user.id) return forbidden();

  const { error } = await supabase
    .from("sleep_records")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[DELETE /api/sleep/[id]]", error);
    return internalError("Failed to delete sleep record");
  }

  return noContent();
}
