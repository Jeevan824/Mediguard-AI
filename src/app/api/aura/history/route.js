/**
 * GET /api/aura/history - Retrieve recent AURA conversation history
 */
import { createServerClient } from "@/lib/supabase";
import { ok, internalError, requireAuth } from "@/lib/apiResponse";

export async function GET(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const { data, error } = await supabase
    .from("aura_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[GET /api/aura/history]", error);
    return internalError("Failed to fetch AURA history");
  }

  return ok(data);
}