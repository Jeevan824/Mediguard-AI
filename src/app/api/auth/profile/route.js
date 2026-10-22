/**
 * POST /api/auth/profile
 *
 * Alias for the profile creation endpoint — called from client after sign-up.
 * Delegates to /api/profile POST.
 */

export { POST } from "@/app/api/profile/route";
