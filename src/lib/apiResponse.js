/**
 * @fileoverview API response helpers for MindGuard.ai Route Handlers.
 *
 * Provides consistent JSON response shapes and HTTP status codes across all API routes.
 * Error responses always include a machine-readable `code` and a human-readable `message`.
 * Success responses always include a `data` key (may be null for 204-equivalent responses).
 */

import { NextResponse } from "next/server";

// ─── Success helpers ──────────────────────────────────────────────────────────

/**
 * 200 OK
 * @template T
 * @param {T} data
 * @returns {NextResponse}
 */
export function ok(data) {
  return NextResponse.json({ data }, { status: 200 });
}

/**
 * 201 Created
 * @template T
 * @param {T} data
 * @returns {NextResponse}
 */
export function created(data) {
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * 204 No Content (empty body)
 * @returns {NextResponse}
 */
export function noContent() {
  return new NextResponse(null, { status: 204 });
}

// ─── Error helpers ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ApiErrorPayload
 * @property {{ code: string, message: string }} error
 */

/**
 * Generic error response factory.
 * @param {string} code   - Machine-readable error code (snake_case)
 * @param {string} message - Human-readable description
 * @param {number} status  - HTTP status code
 * @returns {NextResponse}
 */
function errorResponse(code, message, status) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const badRequest = (message = "Bad request", code = "BAD_REQUEST") =>
  errorResponse(code, message, 400);

export const unauthorized = (message = "Authentication required") =>
  errorResponse("UNAUTHORIZED", message, 401);

export const forbidden = (message = "Access denied") =>
  errorResponse("FORBIDDEN", message, 403);

export const notFound = (resource = "Resource") =>
  errorResponse("NOT_FOUND", `${resource} not found`, 404);

export const conflict = (message = "Resource already exists") =>
  errorResponse("CONFLICT", message, 409);

export const unprocessable = (message = "Validation failed", details = null) =>
  NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message, details } },
    { status: 422 }
  );

export const internalError = (message = "An unexpected error occurred") =>
  errorResponse("INTERNAL_ERROR", message, 500);

// ─── Auth helper ──────────────────────────────────────────────────────────────

/**
 * Extracts the authenticated user from a Supabase server client.
 * Returns null if not authenticated, instead of throwing.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
export async function getAuthUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Extracts the authenticated user or returns a 401 NextResponse.
 * Use this as a guard at the top of every protected route handler.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ user: import('@supabase/supabase-js').User } | { response: NextResponse }>}
 */
export async function requireAuth(supabase) {
  const user = await getAuthUser(supabase);
  if (!user) {
    return { response: unauthorized() };
  }
  return { user };
}
