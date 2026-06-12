import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bfvcszrwegsjkzfllnqo.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let _anonClient: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

/** Public client — anon key, RLS enforced. Safe for reads of active inventory. */
export function getSupabase(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
  }
  return _anonClient;
}

/**
 * Service-role client — bypasses RLS. SERVER ONLY.
 * Never import this from a client component.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin() must never be called in the browser");
  }
  if (!_adminClient) {
    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return _adminClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && (anonKey || serviceRoleKey));
}
