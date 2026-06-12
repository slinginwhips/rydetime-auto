import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE } from "@/lib/adminAuth";

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

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || adminSecret.includes("your_admin_secret")) {
      return NextResponse.json({ error: "Admin access is not configured" }, { status: 503 });
    }
    if (parsed.data.secret !== adminSecret) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, adminSecret, {
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
