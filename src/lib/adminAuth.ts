import { NextRequest } from "next/server";

export const ADMIN_COOKIE = "rydetime_admin";

/** Check Authorization: Bearer header or admin session cookie against ADMIN_SECRET. */
export function isAdminRequest(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.includes("your_admin_secret")) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return cookie === secret;
}
