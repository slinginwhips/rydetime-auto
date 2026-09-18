/**
 * BDC dispatch — the ONLY place an automatic message actually leaves the
 * building. Two hard safety gates protect real customers:
 *   1. BDC_AUTOSEND_ENABLED must be exactly "true" (off by default), and
 *   2. a per-call dryRun always wins.
 * Either gate closed → nothing is sent and the reason is returned, so the
 * caller can log a draft instead of a delivery.
 */
import { sendSmsTo, sendEmailTo } from "@/lib/notificationProvider";
import type { DraftedReply } from "./replyEngine";

export interface DispatchResult {
  ok: boolean;
  /** Set when nothing was sent, explaining why (shown in the thread). */
  skipped?: string;
  providerSid?: string;
}

/** Master switch. Off unless the env var is exactly "true". */
export function isBdcArmed(): boolean {
  return process.env.BDC_AUTOSEND_ENABLED === "true";
}

export async function dispatchReply(
  draft: DraftedReply,
  opts: { dryRun?: boolean; force?: boolean } = {}
): Promise<DispatchResult> {
  if (!draft.target) return { ok: false, skipped: "no reply target" };
  if (opts.dryRun) return { ok: false, skipped: "dry-run" };
  // `force` = a human clicked Send in the admin console; that bypasses the
  // AUTO-send master switch (which only governs the bot sending on its own).
  if (!opts.force && !isBdcArmed()) return { ok: false, skipped: "bdc-disarmed" };

  switch (draft.channel) {
    case "sms": {
      const r = await sendSmsTo(draft.target, draft.body);
      return { ok: r.ok, providerSid: r.sid, skipped: r.ok ? undefined : "twilio-send-failed" };
    }
    case "email":
    case "offerup_relay": {
      const ok = await sendEmailTo(draft.target, {
        subject: draft.subject ?? "RydeTime Auto",
        body: draft.body,
      });
      return { ok, skipped: ok ? undefined : "email-send-failed" };
    }
    default:
      return { ok: false, skipped: `unsupported channel: ${draft.channel}` };
  }
}
