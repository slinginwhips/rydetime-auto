/**
 * POST /api/bdc/resend — Resend Inbound webhook (email.received).
 *
 * Path: Outlook rule REDIRECTS CarGurus/Carfax/OfferUp/CAPS mail (redirect keeps
 * the original From) to our private <id>.resend.app address → Resend fires
 * email.received here → we fetch the raw MIME and hand it to the same BDC
 * orchestrator as /api/bdc/inbound. No DNS changes needed.
 *
 * Auth: Svix signature (svix-id / svix-timestamp / svix-signature) against
 * RESEND_WEBHOOK_SECRET. Fail closed when unset.
 *
 * Only the four known marketplace sources proceed — anything else that lands
 * in the inbox (spam, a forwarded personal email) is ignored, never answered.
 *
 * We answer Resend immediately and do the slow part (Claude draft + send) in
 * after(), so Resend's short webhook timeout never triggers a retry. Retries
 * are still harmless: leads dedupe on (source, external_id), with Message-ID
 * as the fallback id.
 */
import { NextRequest, NextResponse, after } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { handleInboundLead } from "@/lib/bdc/handleInboundLead";
import { parseEmail } from "@/lib/bdc/emailParser";
import { detectSource } from "@/lib/bdc/parseInboundLead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TOLERANCE_SECONDS = 5 * 60;

function verifySvix(body: string, id: string | null, ts: string | null, sigHeader: string | null): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !id || !ts || !sigHeader) return false;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  // Header is space-separated "v1,<base64>" entries (several during key rotation).
  return sigHeader.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

async function fetchRawEmail(emailId: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  const meta = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!meta.ok) {
    // 401/403 here usually means the API key is "sending access" only.
    throw new Error(`Resend receiving API ${meta.status}: ${(await meta.text()).slice(0, 200)}`);
  }
  const json = (await meta.json()) as { raw?: { download_url?: string } | null };
  const url = json.raw?.download_url;
  if (!url) throw new Error("Resend returned no raw download_url");
  const raw = await fetch(url);
  if (!raw.ok) throw new Error(`raw download ${raw.status}`);
  return raw.text();
}

async function ingest(emailId: string): Promise<void> {
  try {
    const raw = await fetchRawEmail(emailId);
    const email = parseEmail(raw);
    // CarGurus also mails digests ("LeadAI: 2 New leads (1 Hot)") that carry
    // no customer. Those are not leads — ignore instead of flagging for review.
    if (/^\s*(re:\s*)?leadai\b/i.test(email.subject || "")) {
      console.log("[api/bdc/resend] ignored digest " + emailId + ": " + email.subject);
      return;
    }
    const source = detectSource(email);
    if (source === "unknown") {
      console.warn(`[api/bdc/resend] ignored email ${emailId}: not a marketplace lead`);
      return;
    }
    const result = await handleInboundLead(raw);
    console.log(`[api/bdc/resend] ${emailId} ${source} → ${result.status} lead=${result.lead_id ?? "-"}`);
  } catch (err) {
    console.error(`[api/bdc/resend] ingest ${emailId} failed:`, err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  if (
    !verifySvix(
      body,
      req.headers.get("svix-id"),
      req.headers.get("svix-timestamp"),
      req.headers.get("svix-signature")
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  if (event.type !== "email.received" || !event.data?.email_id) {
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  const emailId = event.data.email_id;
  after(() => ingest(emailId));
  return NextResponse.json({ ok: true });
}
