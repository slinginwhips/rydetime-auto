import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/** True when Supabase is fully configured for server-side admin reads. */
export function adminDbReady(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Run a Supabase admin query, returning a fallback (usually []) on any
 * failure so admin pages always render.
 */
export async function safeQuery<T>(
  fallback: T,
  fn: (supabase: ReturnType<typeof getSupabaseAdmin>) => Promise<T>
): Promise<T> {
  if (!adminDbReady()) return fallback;
  try {
    return await fn(getSupabaseAdmin());
  } catch (err) {
    console.error("[admin] query failed:", err);
    return fallback;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
