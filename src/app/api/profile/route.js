/**
 * POST /api/auth/profile
 *
 * Creates a profile for the currently authenticated user.
 * Called once after the first sign-up, before any monitoring session begins.
 */

import { createServerClient } from "@/lib/supabase";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  conflict,
  internalError,
  requireAuth,
} from "@/lib/apiResponse";
import { createProfileSchema, parseBody } from "@/lib/validation";

export async function POST(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const parsed = await parseBody(request, createProfileSchema);
  if (parsed.error) {
    return badRequest(
      parsed.error instanceof Error
        ? parsed.error.message
        : "Invalid request body"
    );
  }

  // Check if profile already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existing) return conflict("Profile already exists for this user");

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/auth/profile]", error);
    return internalError("Failed to create profile");
  }

  // Also create default settings row
  await supabase.from("user_settings").insert({
    user_id: user.id,
    theme: "void",
  });

  // Also create default baseline row
  await supabase.from("baseline_profiles").insert({
    user_id: user.id,
  });

  return created(data);
}

/**
 * GET /api/profile
 *
 * Returns the authenticated user's profile with their settings and baseline.
 */
export async function GET() {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      user_settings (*),
      baseline_profiles (*)
    `
    )
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return unauthorized("Profile not found. Please complete setup.");
    }
    console.error("[GET /api/profile]", error);
    return internalError("Failed to fetch profile");
  }

  return ok(data);
}

/**
 * PATCH /api/profile
 *
 * Updates mutable fields on the authenticated user's profile.
 */
export async function PATCH(request) {
  const supabase = await createServerClient();
  const { user, response } = await requireAuth(supabase);
  if (response) return response;

  const { updateProfileSchema } = await import("@/lib/validation");
  const parsed = await parseBody(request, updateProfileSchema);
  if (parsed.error) {
    return badRequest("Invalid request body");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/profile]", error);
    return internalError("Failed to update profile");
  }

  return ok(data);
}
