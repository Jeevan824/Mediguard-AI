/**
 * GET  /api/reports - List user's wellness reports
 * POST /api/reports - Create a new wellness report
 */
import { createServerClient } from "@/lib/supabase";
import { ok, created, badRequest, internalError, requireAuth } from "@/lib/apiResponse";
import { createReportSchema, parseBody } from "@/lib/validation";

export async function GET(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));

  const { data, error } = await supabase
    .from("wellness_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[GET /api/reports]", error);
    return internalError("Failed to fetch reports");
  }

  return ok(data ?? []);
}

export async function POST(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const parsed = await parseBody(request, createReportSchema);
  if (parsed.error) return badRequest("Invalid report data");

  const { data, error } = await supabase
    .from("wellness_reports")
    .insert({
      user_id: user.id,
      session_id: parsed.data.session_id ?? null,
      report_type: parsed.data.report_type,
      report_data: parsed.data.report_data,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/reports]", error);
    return internalError("Failed to create report");
  }

  return created(data);
}