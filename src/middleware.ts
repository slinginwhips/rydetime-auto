import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminSecret } from "@/lib/adminAuth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login page itself must stay reachable.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;

  const authorized = isValidAdminSecret(cookie);

  if (!authorized) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
