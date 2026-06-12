/**
 * Notification provider — email + SMS placeholders with console.log fallback.
 * Swap in a real transactional email service (Resend, SES) and Twilio when ready.
 */
export interface NotificationPayload {
  subject: string;
  body: string;
}

export interface NotificationProvider {
  sendEmail(payload: NotificationPayload): Promise<boolean>;
  sendSms(message: string): Promise<boolean>;
}

class PlaceholderNotificationProvider implements NotificationProvider {
  async sendEmail(payload: NotificationPayload): Promise<boolean> {
    const to = process.env.NOTIFICATION_EMAIL;
    // TODO: wire to a transactional email provider (Resend / SES / SendGrid).
    console.log(`[notification:email] to=${to || "(unset)"} subject="${payload.subject}"\n${payload.body}`);
    return true;
  }

  async sendSms(message: string): Promise<boolean> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from || sid === "placeholder") {
      console.log(`[notification:sms] (Twilio not configured) ${message}`);
      return true;
    }
    // Twilio configured — send via REST API (no SDK dependency needed).
    try {
      const to = process.env.NOTIFICATION_PHONE || "";
      if (!to) {
        console.log(`[notification:sms] NOTIFICATION_PHONE unset: ${message}`);
        return true;
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

const provider: NotificationProvider = new PlaceholderNotificationProvider();

export function getNotificationProvider(): NotificationProvider {
  return provider;
}

/** Convenience: send both email and SMS for high-priority dealership alerts. */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  await provider.sendEmail(payload);
  await provider.sendSms(`${payload.subject}`);
}
