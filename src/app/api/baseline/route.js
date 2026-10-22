/**
 * GET   /api/baseline - Fetch user's baseline profile
 * PATCH /api/baseline - Update user's baseline profile
 */
import { createServerClient } from "@/lib/supabase";
import { ok, badRequest, notFound, internalError, requireAuth } from "@/lib/apiResponse";
import { updateBaselineSchema, parseBody } from "@/lib/validation";

export async function GET() {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { data, error } = await supabase
    .from("baseline_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return notFound("Baseline profile");
    console.error("[GET /api/baseline]", error);
    return internalError("Failed to fetch baseline");
  }

  return ok(data);
}

export async function PATCH(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const parsed = await parseBody(request, updateBaselineSchema);
  if (parsed.error) return badRequest("Invalid baseline data");

  const { data, error } = await supabase
    .from("baseline_profiles")
    .upsert(
      { user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/baseline]", error);
    return internalError("Failed to update baseline");
  }

  return ok(data);
}