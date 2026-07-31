/**
 * Hand a signed credit application to the RydeTime DMS.
 *
 * WHY: this site collects a full 9-digit SSN, pushes it to DealerCenter and
 * deliberately never stores it — `credit_applications.ssn_last4` is all that
 * is kept, and that stays true. But Dealertrack's application needs all nine,
 * and the DMS pulls its copy of each application from THIS database, so it
 * could only ever see four. Ryan retyped the number on every deal.
 *
 * So the full application is pushed once, at submit time, straight to the DMS,
 * which encrypts the social on arrival (AES-256-GCM) and puts it behind an
 * audited reveal. Nothing here changes what this project stores.
 *
 * Configure:
 *   DMS_INTAKE_URL     e.g. https://rydetime-dms.vercel.app/api/inbound/credit-app
 *   DMS_INTAKE_SECRET  shared secret, sent as a bearer token
 * Unconfigured → skipped silently, and the DMS's own poller still files the
 * application a minute or two later (just without the SSN).
 *
 * Never throws and never fails a customer's submission: the DealerCenter push
 * is what runs credit today, and a DMS hiccup must not cost a deal.
 */

const TIMEOUT_MS = 8000;

export type DmsPushResult =
  | { status: "skipped" }
  | { status: "ok"; filed: boolean }
  | { status: "failed"; error: string };

export async function pushCreditAppToDms(
  row: Record<string, unknown>
): Promise<DmsPushResult> {
  const url = process.env.DMS_INTAKE_URL;
  const secret = process.env.DMS_INTAKE_SECRET;
  if (!url || !secret) return { status: "skipped" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ table: "credit_applications", row }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      // Read the status only. The response is ours, but keeping the habit of
      // not echoing this exchange anywhere is what keeps the SSN in flight.
      return { status: "failed", error: `HTTP ${response.status}` };
    }
    const body = (await response.json()) as { filed?: boolean };
    return { status: "ok", filed: Boolean(body.filed) };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `timed out after ${TIMEOUT_MS}ms`
          : err.message
        : "unknown error";
    return { status: "failed", error: message };
  } finally {
    clearTimeout(timer);
  }
}
