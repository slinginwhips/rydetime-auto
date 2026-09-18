/**
 * POST /api/bdc/inbound — intake for redirected marketplace lead emails.
 *
 * An Outlook rule (or Cloudflare Email Worker) redirects CarGurus/Carfax/
 * OfferUp/CAPS mail here as raw MIME. We authenticate with a shared secret,
 * then hand the raw email to the BDC orchestrator.
 *
 * Body: raw email as text/plain, OR JSON { "raw": "<mime>", "dryRun": true }.
 * Auth: header `x-bdc-secret` (or ?secret=) must equal BDC_INBOUND_SECRET.
 * Add ?dryRun=1 to parse + thread + draft WITHOUT sending (safe testing).
 */
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { handleInboundLead } from "@/lib/bdc/handleInboundLead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function secretOk(provided: string | null): boolean {
  const expected = process.env.BDC_INBOUND_SECRET;
  if (!expected) return false; // fail closed when unconfigured
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const provided = req.headers.get("x-bdc-secret") || url.searchParams.get("secret");
    if (!secretOk(provided)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dryRun = url.searchParams.get("dryRun") === "1" || url.searchParams.get("dryRun") === "true";
    const contentType = req.headers.get("content-type") || "";

    let raw: string;
    let bodyDryRun = false;
    if (contentType.includes("application/json")) {
      const json = (await req.json().catch(() => null)) as { raw?: string; dryRun?: boolean } | null;
      if (!json?.raw) {
        return NextResponse.json({ error: "Missing 'raw' email in JSON body" }, { status: 400 });
      }
      raw = json.raw;
      bodyDryRun = Boolean(json.dryRun);
    } else {
      raw = await req.text();
      if (!raw.trim()) {
        return NextResponse.json({ error: "Empty email body" }, { status: 400 });
      }
    }

    const result = await handleInboundLead(raw, { dryRun: dryRun || bodyDryRun });
    return NextResponse.json({
      status: result.status,
      lead_id: result.lead_id,
      source: result.parsed.source,
      detail: result.detail,
    });
  } catch (err) {
    console.error("[api/bdc/inbound] failed:", err);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
