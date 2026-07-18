import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, getAdminSecrets, isValidAdminSecret } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  secret: z.string().min(1).max(500),
});

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

    if (getAdminSecrets().length === 0) {
      return NextResponse.json({ error: "Admin access is not configured" }, { status: 503 });
    }
    if (!isValidAdminSecret(parsed.data.secret)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

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
