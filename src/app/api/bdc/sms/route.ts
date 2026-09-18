/**
 * POST /api/bdc/sms — Twilio inbound SMS/MMS webhook (customer replies).
 *
 * Does three things, all under the customer's own lead thread:
 *   1. STOP/UNSUBSCRIBE/etc. → mark the lead opted_out (never message again).
 *   2. Thread the inbound text under the matching lead (by phone).
 *   3. Save any MMS media (texted-in paperwork) to that lead's file.
 *
 * Auth: validates Twilio's X-Twilio-Signature against TWILIO_AUTH_TOKEN.
 * (Auto-replying to the customer — the two-way conversation loop — is the next
 * slice; this endpoint currently captures + files the reply.)
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import {
  findLeadByContact,
  logMessage,
  addEvent,
  setOptedOut,
  setBdcStatus,
  saveAttachmentFromUrl,
  getBdcLead,
  getThread,
} from "@/lib/bdc/store";
import { draftFollowUp } from "@/lib/bdc/replyEngine";
import { dispatchReply } from "@/lib/bdc/dispatch";
import { isAIConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPT_OUT_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
function twiml(): NextResponse {
  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/**
 * Validate Twilio's request signature: base64( HMAC-SHA1( authToken,
 * fullUrl + each POST param name+value sorted by name ) ).
 */
function isValidTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || token === "placeholder") return false; // fail closed
  if (!signature) return false;
  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];
  const expected = createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  return expected === signature;
}

function reconstructUrl(req: NextRequest): string {
  if (process.env.TWILIO_WEBHOOK_URL) return process.env.TWILIO_WEBHOOK_URL;
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return `${proto}://${host}${new URL(req.url).pathname}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

    if (!isValidTwilioSignature(reconstructUrl(req), params, req.headers.get("x-twilio-signature"))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const from = (params.From || "").trim();
    const body = (params.Body || "").trim();
    const numMedia = parseInt(params.NumMedia || "0", 10) || 0;

    const lead = from ? await findLeadByContact(from) : null;

    // 1. Opt-out — honor it even if we can't match a lead (best effort).
    if (OPT_OUT_WORDS.has(body.toUpperCase())) {
      if (lead) {
        await setOptedOut(lead.id);
        await logMessage({ lead_id: lead.id, direction: "inbound", channel: "sms", body });
        await addEvent(lead.id, "customer_opted_out", "STOP received");
      }
      return twiml();
    }

    // No matching lead — nothing to thread against. (Could be a brand-new number.)
    if (!lead) return twiml();

    // 2. Thread the inbound message.
    const messageId = await logMessage({
      lead_id: lead.id,
      direction: "inbound",
      channel: "sms",
      body: body || (numMedia > 0 ? "(sent an attachment)" : ""),
      provider_sid: params.MessageSid || null,
    });
    await setBdcStatus(lead.id, "replied");
    await addEvent(lead.id, "customer_replied", numMedia > 0 ? `${numMedia} attachment(s)` : "text");

    // 3. Save MMS media (paperwork) to the lead's file.
    if (numMedia > 0) {
      const sid = process.env.TWILIO_ACCOUNT_SID || "";
      const token = process.env.TWILIO_AUTH_TOKEN || "";
      const authHeader = sid && token ? "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") : undefined;
      for (let i = 0; i < numMedia; i++) {
        const url = params[`MediaUrl${i}`];
        if (!url) continue;
        await saveAttachmentFromUrl({
          lead_id: lead.id,
          message_id: messageId,
          url,
          contentType: params[`MediaContentType${i}`],
          authHeader,
        });
      }
      await addEvent(lead.id, "attachment_saved", `${numMedia} file(s) from customer text`);
    }

    // 4. Two-way loop: draft an automatic reply from the thread so far and send
    // it — gated by the SAME arm switch as first-touch (dispatchReply). When
    // disarmed, the draft is filed to the thread (sent=false) for review.
    try {
      if (isAIConfigured()) {
        const ctx = await getBdcLead(lead.id);
        if (ctx && !ctx.opted_out) {
          const history = await getThread(lead.id); // includes the reply we just logged
          const draft = await draftFollowUp(ctx, history);
          const result = await dispatchReply(draft);
          await logMessage({
            lead_id: lead.id,
            direction: "outbound",
            channel: draft.channel,
            body: draft.body,
            sent: result.ok,
            skip_reason: result.skipped ?? null,
            provider_sid: result.providerSid ?? null,
          });
          await addEvent(
            lead.id,
            result.ok ? "bdc_auto_replied" : "bdc_reply_drafted",
            result.ok ? `channel=${draft.channel}` : `not sent: ${result.skipped}`
          );
        }
      }
    } catch (err) {
      console.error("[api/bdc/sms] follow-up draft/send failed:", err);
    }

    return twiml();
  } catch (err) {
    console.error("[api/bdc/sms] failed:", err);
    // Still return 200 TwiML so Twilio doesn't retry-storm; we've logged it.
    return twiml();
  }
}
