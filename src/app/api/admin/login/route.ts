import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, getAdminSecrets, isValidAdminSecret } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  secret: z.string().min(1).max(500),
});

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Lock an IP out after repeated wrong guesses. In-memory (per server
// instance), so it is a speed bump rather than a wall — the secret itself is
// long and random, which is the real protection.
const MAX_FAILURES = 6;
const LOCKOUT_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; first: number }>();

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function isLockedOut(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > LOCKOUT_MS) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const entry = failures.get(ip);
  if (!entry || Date.now() - entry.first > LOCKOUT_MS) {
    failures.set(ip, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

/** Login: sets the httpOnly admin session cookie when the secret matches. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Secret is required" }, { status: 400 });
    }

    const ip = clientIp(req);
    if (isLockedOut(ip)) {
      return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    }

    if (getAdminSecrets().length === 0) {
      return NextResponse.json({ error: "Admin access is not configured" }, { status: 503 });
    }
    if (!isValidAdminSecret(parsed.data.secret)) {
      recordFailure(ip);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    failures.delete(ip);
    const res = NextResponse.json({ success: true });
    // Store the exact secret the user logged in with, so each person's session
    // is tied to their own secret and is revoked if that one is removed.
    res.cookies.set(ADMIN_COOKIE, parsed.data.secret, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("[api/admin/login] failed:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

/** Logout: clears the admin session cookie. */
export async function DELETE(): Promise<NextResponse> {
  try {
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, "", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("[api/admin/login] logout failed:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
