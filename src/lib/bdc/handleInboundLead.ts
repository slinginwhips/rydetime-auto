/**
 * BDC orchestrator: one raw marketplace email in → a threaded lead, a drafted
 * first-touch, and (only when armed) an automatic send out. Every branch is
 * logged to the lead's thread so nothing happens invisibly.
 *
 * Safety: sending is gated in dispatchReply (BDC_AUTOSEND_ENABLED + dryRun).
 * When disarmed, the draft is still written to the thread as sent=false so the
 * dealership can review exactly what WOULD have gone out — no customer is texted.
 */
import { parseInboundLead } from "./parseInboundLead";
import { draftFirstTouch } from "./replyEngine";
import { dispatchReply } from "./dispatch";
import { applyDraftTags } from "./applyDraftTags";
import { findOrCreateLead, logMessage, addEvent, setBdcStatus, hasDb } from "./store";
import { sendNotification } from "@/lib/notificationProvider";
import type { ParsedInboundLead } from "@/types/bdc";

export interface HandleResult {
  status: "sent" | "drafted" | "duplicate" | "opted_out" | "uncontactable" | "no_db" | "error";
  lead_id: string | null;
  parsed: ParsedInboundLead;
  detail?: string;
}

export async function handleInboundLead(
  rawEmail: string,
  opts: { dryRun?: boolean } = {}
): Promise<HandleResult> {
  const parsed = parseInboundLead(rawEmail);

  // Nothing to do with a lead we can't reply to — alert a human instead.
  if (!parsed.contactable || parsed.reply_channel === "none") {
    await notifyHuman(parsed, "Lead arrived with no usable contact info.");
    return { status: "uncontactable", lead_id: null, parsed };
  }

  if (!hasDb()) {
    // No DB in this environment: draft + (maybe) send, but we can't thread it.
    const draft = await draftFirstTouch(parsed).catch(() => null);
    if (draft) await dispatchReply(draft, opts);
    return { status: "no_db", lead_id: null, parsed };
  }

  const rec = await findOrCreateLead(parsed);
  if (!rec) return { status: "error", lead_id: null, parsed, detail: "lead upsert failed" };

  if (!rec.isNew) {
    // Already handled — do NOT re-text an existing customer.
    await addEvent(rec.id, "bdc_duplicate_ignored", `${parsed.source} redelivery`);
    return { status: "duplicate", lead_id: rec.id, parsed };
  }

  await addEvent(rec.id, "bdc_lead_created", `source=${parsed.source}`);

  if (rec.opted_out) {
    return { status: "opted_out", lead_id: rec.id, parsed };
  }

  return runFirstTouch(rec.id, parsed, opts);
}

/**
 * Draft + (maybe) send the first message for a lead row that already exists.
 * Shared by marketplace ingestion and website form leads so both paths get the
 * same guardrails, tags, and thread logging.
 */
export async function runFirstTouch(
  leadId: string,
  parsed: ParsedInboundLead,
  opts: { dryRun?: boolean } = {}
): Promise<HandleResult> {
  // Draft the first touch. If drafting fails, alert a human rather than sending nothing silently.
  let draft;
  try {
    draft = await draftFirstTouch(parsed);
  } catch (err) {
    await addEvent(leadId, "bdc_draft_failed", err instanceof Error ? err.message : "unknown");
    await notifyHuman(parsed, "BDC could not draft a reply — needs manual follow-up.");
    return { status: "error", lead_id: leadId, parsed, detail: "draft failed" };
  }

  const result = await dispatchReply(draft, opts);

  await logMessage({
    lead_id: leadId,
    direction: "outbound",
    channel: draft.channel,
    body: draft.body,
    sent: result.ok,
    skip_reason: result.skipped ?? null,
    provider_sid: result.providerSid ?? null,
  });

  await applyDraftTags(leadId, draft, parsed, null);

  if (result.ok) {
    await addEvent(leadId, "bdc_contacted", `channel=${draft.channel}`);
    if (!draft.needs_human) await setBdcStatus(leadId, "contacted");
    return { status: "sent", lead_id: leadId, parsed };
  }

  // Drafted but not sent (disarmed / dry-run / send failure) — filed for review.
  await addEvent(leadId, "bdc_draft_saved", `not sent: ${result.skipped}`);
  return { status: "drafted", lead_id: leadId, parsed, detail: result.skipped };
}

async function notifyHuman(parsed: ParsedInboundLead, why: string): Promise<void> {
  try {
    await sendNotification({
      subject: `BDC needs a human: ${parsed.first_name ?? "lead"} (${parsed.source})`,
      body: [
        why,
        `Name: ${[parsed.first_name, parsed.last_name].filter(Boolean).join(" ") || "—"}`,
        `Phone: ${parsed.phone ?? "—"}`,
        `Email: ${parsed.email ?? "—"}`,
        parsed.vehicle_title ? `Vehicle: ${parsed.vehicle_title}` : null,
        parsed.message ? `Note: ${parsed.message}` : null,
      ]
        .filter((l): l is string => l !== null)
        .join("\n"),
    });
  } catch {
    // Notification is best-effort; never let it break ingestion.
  }
}
