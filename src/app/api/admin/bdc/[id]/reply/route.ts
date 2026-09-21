/**
 * POST /api/admin/bdc/[id]/reply — a human rep sends a message into a lead's
 * thread from the admin console. Human-initiated, so it bypasses the auto-send
 * master switch (force:true) but still refuses opted-out customers.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/adminAuth";
import { getBdcLead, logMessage, addEvent, setBdcStatus } from "@/lib/bdc/store";
import { dispatchReply } from "@/lib/bdc/dispatch";
import type { DraftedReply } from "@/lib/bdc/replyEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message body required (1–1000 chars)" }, { status: 400 });
  }

  const lead = await getBdcLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.opted_out) {
    return NextResponse.json({ error: "This customer has opted out (STOP). Cannot message them." }, { status: 400 });
  }
  if (!lead.reply_target) {
    return NextResponse.json({ error: "No contact rail on this lead." }, { status: 400 });
  }

  const draft: DraftedReply = {
    channel: lead.reply_channel,
    target: lead.reply_target,
    subject: lead.reply_channel === "sms" ? null : "RydeTime Auto",
    body: parsed.data.body,
    link: null,
    matched_vehicle: null,
    model: "manual",
  };

  const result = await dispatchReply(draft, { force: true });

  await logMessage({
    lead_id: id,
    direction: "outbound",
    channel: draft.channel,
    body: draft.body,
    sent: result.ok,
    skip_reason: result.skipped ?? null,
    provider_sid: result.providerSid ?? null,
  });
  await addEvent(id, "manual_reply", result.ok ? "sent by rep" : `not sent: ${result.skipped}`);
  // A human is in the conversation now — pause the bot on this lead so the two
  // never talk over each other. "Hand back to BDC" in the console resumes it.
  if (result.ok) await setBdcStatus(id, "manual");

  return NextResponse.json({ ok: result.ok, skipped: result.skipped });
}
