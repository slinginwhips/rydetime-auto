/**
 * GET /api/admin/bdc/diagnose — why didn't that lead email become a lead?
 *
 * The live path (/api/bdc/resend) does its work in after() and can only write
 * failures to the Vercel log, which is awkward to read. This replays the same
 * steps for the most recent received emails and REPORTS each step's outcome.
 *
 * Admin-only. Read-only by default: it parses but does NOT create leads or
 * send anything unless ?ingest=<email_id> is given, which runs the real
 * orchestrator for that one email (still subject to the auto-send switch).
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { parseEmail } from "@/lib/bdc/emailParser";
import { detectSource, parseInboundLead } from "@/lib/bdc/parseInboundLead";
import { handleInboundLead } from "@/lib/bdc/handleInboundLead";
import { isAIConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API = "https://api.resend.com";

async function resendGet(path: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, status: 0, body: "RESEND_API_KEY not set" };
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${key}` } });
  const text = await res.text();
  let body: unknown = text.slice(0, 500);
  try {
    body = JSON.parse(text);
  } catch {
    /* keep the raw text */
  }
  return { ok: res.ok, status: res.status, body };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const ingestId = url.searchParams.get("ingest");

  const env = {
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    RESEND_WEBHOOK_SECRET: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    ANTHROPIC: isAIConfigured(),
    TWILIO: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
    BDC_AUTOSEND_ENABLED: process.env.BDC_AUTOSEND_ENABLED ?? "(unset)",
  };

  // 1. Can we even list received emails with this key?
  const list = await resendGet("/emails/receiving?limit=10");
  if (!list.ok) {
    return NextResponse.json(
      { env, step: "list_received", ok: false, status: list.status, detail: list.body },
      { status: 200 }
    );
  }

  const rows = ((list.body as { data?: { id: string; subject?: string; from?: string }[] })?.data ?? []).slice(0, 10);

  const ids = ingestId ? [ingestId] : rows.map((r) => r.id);
  const results: unknown[] = [];

  for (const id of ids) {
    try {
      const meta = await resendGet(`/emails/receiving/${encodeURIComponent(id)}`);
      if (!meta.ok) {
        results.push({ id, step: "get_email", ok: false, status: meta.status, detail: meta.body });
        continue;
      }
      const downloadUrl = (meta.body as { raw?: { download_url?: string } })?.raw?.download_url;
      if (!downloadUrl) {
        results.push({ id, step: "raw_url", ok: false, detail: "no raw.download_url on the response" });
        continue;
      }
      const rawRes = await fetch(downloadUrl);
      if (!rawRes.ok) {
        results.push({ id, step: "raw_download", ok: false, status: rawRes.status });
        continue;
      }
      const raw = await rawRes.text();
      const source = detectSource(parseEmail(raw));
      const lead = parseInboundLead(raw);
      const summary = {
        id,
        subject: (meta.body as { subject?: string }).subject,
        from: (meta.body as { from?: string }).from,
        source,
        name: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || null,
        phone: lead.phone,
        email: lead.email,
        contactable: lead.contactable,
        reply_channel: lead.reply_channel,
        external_id: lead.external_id,
        warnings: lead.warnings,
      };

      if (ingestId) {
        const outcome = await handleInboundLead(raw);
        results.push({ ...summary, ingested: { status: outcome.status, lead_id: outcome.lead_id, detail: outcome.detail } });
      } else {
        results.push(summary);
      }
    } catch (err) {
      results.push({ id, step: "exception", detail: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ env, count: rows.length, results });
}
