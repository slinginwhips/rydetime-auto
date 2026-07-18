import { NextRequest } from "next/server";

export const ADMIN_COOKIE = "rydetime_admin";

/**
 * Parse ADMIN_SECRET into the set of accepted admin secrets.
 * Supports multiple comma-separated logins (e.g. one per person), so each
 * user has their own revocable secret. Placeholder/unset values are ignored.
 */
export function getAdminSecrets(): string[] {
  const raw = process.env.ADMIN_SECRET;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.includes("your_admin_secret"));
}

/** True when `value` matches one of the configured admin secrets. */
export function isValidAdminSecret(value: string | undefined | null): boolean {
  if (!value) return false;
  return getAdminSecrets().includes(value);
}

/** Check Authorization: Bearer header or admin session cookie against ADMIN_SECRET. */
export function isAdminRequest(req: NextRequest): boolean {
  const secrets = getAdminSecrets();
  if (secrets.length === 0) return false;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length);
    if (secrets.includes(token)) return true;
  }
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(cookie && secrets.includes(cookie));
}

/**
 * Check Authorization: Bearer header against CRON_SECRET.
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. This is kept
 * independent from ADMIN_SECRET so rotating the human logins never breaks
 * the scheduled inventory sync.
 */
export function isCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.includes("your_cron_secret")) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
