/**
 * @fileoverview Browser-only Supabase client for client components.
 * Does NOT import next/headers — safe for use in "use client" components.
 */
import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase client for use in browser/client components.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createBrowserClient() {
  return _createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}