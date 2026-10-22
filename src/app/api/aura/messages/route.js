/**
 * POST /api/aura/messages - Save an AURA conversation exchange
 */
import { createServerClient } from "@/lib/supabase";
import { created, badRequest, internalError, requireAuth } from "@/lib/apiResponse";
import { createAuraMessageSchema, parseBody } from "@/lib/validation";

export async function POST(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const parsed = await parseBody(request, createAuraMessageSchema);
  if (parsed.error) return badRequest("Invalid message data");

  const { data, error } = await supabase
    .from("aura_conversations")
    .insert({
      user_id: user.id,
      message: parsed.data.message,
      intent: parsed.data.intent ?? null,
      response: parsed.data.response,
      wellness_context: parsed.data.wellness_context ?? null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/aura/messages]", error);
    return internalError("Failed to save message");
  }

  return created(data);
}