/**
 * Escalation — when the BDC hits a question it can't answer (payment on a
 * trade, "can you do $18k", anything needing a human decision), it tells the
 * customer someone will get back to them AND pings the staff here.
 *
 * Recipients come from BDC_ALERT_PHONES / BDC_ALERT_EMAILS (comma-separated)
 * so nobody's personal number lives in the repo. Falls back to the existing
 * single NOTIFICATION_PHONE / NOTIFICATION_EMAIL when those are unset.
 *
 * Alerts are best-effort: a failed text must never break the customer reply.
 */
import { sendSmsTo, sendEmailTo } from "@/lib/notificationProvider";
import { DEALERSHIP } from "@/lib/dealership";

function list(envValue: string | undefined, fallback: string | undefined): string[] {
  const raw = envValue && envValue.trim() ? envValue : fallback || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function alertPhones(): string[] {
  return list(process.env.BDC_ALERT_PHONES, process.env.NOTIFICATION_PHONE);
}

export function alertEmails(): string[] {
  return list(process.env.BDC_ALERT_EMAILS, process.env.NOTIFICATION_EMAIL);
}

export interface EscalationInput {
  leadId: string | null;
  customerName: string | null;
  customerContact: string | null;
  /** Why the BDC needs a human — the model's own words, or our reason. */
  reason: string;
  /** The customer's last message, for context. */
  lastMessage?: string | null;
}

/**
 * Text + email everyone on the alert list. Returns how many of each went out
 * so the caller can log whether anybody was actually reachable.
 */
export async function alertStaff(input: EscalationInput): Promise<{ sms: number; email: number }> {
  const name = input.customerName || "A customer";
  const leadUrl = input.leadId ? `${DEALERSHIP.siteUrl}/admin/leads/${input.leadId}` : `${DEALERSHIP.siteUrl}/admin/leads`;

  const smsBody = [
    `RydeTime BDC needs you: ${name}${input.customerContact ? ` (${input.customerContact})` : ""}`,
    input.reason,
    input.lastMessage ? `They said: "${input.lastMessage.slice(0, 160)}"` : null,
    leadUrl,
  ]
    .filter(Boolean)
    .join("\n");

  let sms = 0;
  for (const phone of alertPhones()) {
    // force:true isn't needed here — this is staff notification, not a customer
    // message, so the auto-send arm switch deliberately does not gate it.
    const res = await sendSmsTo(phone, smsBody).catch(() => ({ ok: false }));
    if (res.ok) sms += 1;
  }

  const emails = alertEmails();
  let email = 0;
  if (emails.length > 0) {
    // sendEmailTo already splits a comma-separated list into recipients.
    const ok = await sendEmailTo(emails.join(","), {
      subject: `BDC needs you — ${name}`,
      body: [
        `${name}${input.customerContact ? ` (${input.customerContact})` : ""} asked something the BDC can't answer.`,
        ``,
        `Reason: ${input.reason}`,
        input.lastMessage ? `Their message: "${input.lastMessage}"` : "",
        ``,
        `Open the conversation: ${leadUrl}`,
      ]
        .filter((line) => line !== "")
        .join("\n"),
    }).catch(() => false);
    if (ok) email = emails.length;
  }

  return { sms, email };
}
