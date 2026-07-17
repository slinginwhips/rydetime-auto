/**
 * Notification provider — email via Resend (RESEND_API_KEY), SMS via Twilio.
 * Falls back to console.log when unconfigured, and reports that honestly by
 * returning false so callers never mistake a dropped message for a delivery.
 */
export interface NotificationPayload {
  subject: string;
  body: string;
}

export interface NotificationProvider {
  sendEmail(payload: NotificationPayload): Promise<boolean>;
  sendSms(message: string): Promise<boolean>;
}

/**
 * Send an email to an arbitrary recipient via Resend.
 * From-address: RESEND_FROM_EMAIL. Until the rydetimeauto.com domain is
 * verified in Resend, use "onboarding@resend.dev" (delivers only to the
 * Resend account owner's address); after verification, switch to
 * "RydeTime Auto <leads@rydetimeauto.com>".
 */
export async function sendEmailTo(
  to: string,
  payload: NotificationPayload
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    console.log(`[notification:email] (Resend not configured) to=${to} subject="${payload.subject}"\n${payload.body}`);
    return false;
  }
  const from = process.env.RESEND_FROM_EMAIL || "RydeTime Auto <onboarding@resend.dev>";
  // Support comma-separated recipient lists (e.g. "ryan@…,dawn@…").
  const recipients = to.split(",").map((a) => a.trim()).filter(Boolean);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: recipients, subject: payload.subject, text: payload.body }),
    });
    if (!res.ok) {
      console.error(`[notification:email] Resend returned ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notification:email] Resend request failed", err);
    return false;
  }
}

class DefaultNotificationProvider implements NotificationProvider {
  async sendEmail(payload: NotificationPayload): Promise<boolean> {
    const to = process.env.NOTIFICATION_EMAIL;
    if (!to) {
      console.log(`[notification:email] NOTIFICATION_EMAIL unset, subject="${payload.subject}"`);
      return false;
    }
    return sendEmailTo(to, payload);
  }

  async sendSms(message: string): Promise<boolean> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from || sid === "placeholder") {
      console.log(`[notification:sms] (Twilio not configured) ${message}`);
      return false;
    }
    // Twilio configured — send via REST API (no SDK dependency needed).
    try {
      const to = process.env.NOTIFICATION_PHONE || "";
      if (!to) {
        console.log(`[notification:sms] NOTIFICATION_PHONE unset: ${message}`);
        return false;
      }
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ From: from, To: to, Body: message }),
        }
      );
      return res.ok;
    } catch (err) {
      console.error("[notification:sms] failed", err);
      return false;
    }
  }
}

const provider: NotificationProvider = new DefaultNotificationProvider();

export function getNotificationProvider(): NotificationProvider {
  return provider;
}

/** Convenience: send both email and SMS for high-priority dealership alerts. */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  await provider.sendEmail(payload);
  await provider.sendSms(`${payload.subject}`);
}
