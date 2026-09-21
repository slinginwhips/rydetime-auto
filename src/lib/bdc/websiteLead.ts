/**
 * Website form leads (contact, test drive, trade, finance, chat, hold) handled
 * by the same BDC brain as marketplace leads.
 *
 * Ryan's rule: reach out by PHONE when there's a number, email only when a
 * phone isn't available. A customer who just filled out a form asking us to
 * contact them is inbound-initiated, and the first SMS still identifies the
 * business and carries "Reply STOP" (applySmsCompliance).
 */
import { runFirstTouch } from "./handleInboundLead";
import { addEvent, setBdcStatus } from "./store";
import type { ParsedInboundLead } from "@/types/bdc";
import type { LeadType } from "@/types/lead";
import type { Vehicle } from "@/types/vehicle";

export interface WebsiteLeadInput {
  leadId: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  chat_summary?: string | null;
  lead_type: LeadType;
  vehicle: Vehicle | null;
  vin?: string | null;
  stock_number?: string | null;
  source_url?: string | null;
}

/** E.164 for US 10-digit input; returns null when it clearly isn't a phone. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 11) return `+${digits}`;
  return null;
}

/** Shape a website form submission as the BDC's standard lead object. */
export function websiteLeadToParsed(input: WebsiteLeadInput): ParsedInboundLead {
  const phone = toE164(input.phone);
  const email = input.email?.trim() || null;
  // Phone first — email only when there is no usable number.
  const reply_channel = phone ? "sms" : email ? "email" : "none";
  const reply_target = phone ?? email;

  const vehicleTitle = input.vehicle
    ? [input.vehicle.year, input.vehicle.make, input.vehicle.model, input.vehicle.trim]
        .filter(Boolean)
        .join(" ")
    : null;

  return {
    source: "website",
    received_at: new Date().toISOString(),
    first_name: input.first_name || null,
    last_name: input.last_name || null,
    email,
    phone,
    vin: input.vehicle?.vin ?? input.vin ?? null,
    stock_number: input.vehicle?.stock_number ?? input.stock_number ?? null,
    vehicle_title: vehicleTitle,
    listed_price: null,
    message: [input.message, input.chat_summary].filter(Boolean).join("\n\n") || null,
    external_id: `website:${input.leadId}`,
    external_url: input.source_url ?? null,
    reply_channel,
    reply_target,
    suggested_lead_type: input.lead_type,
    vehicle_present: Boolean(input.vehicle || input.vin || input.stock_number),
    contactable: reply_channel !== "none",
    warnings: [],
  };
}

/**
 * Fire the BDC first touch for a freshly created website lead. Safe to call
 * without awaiting the result for the customer's sake — the form response
 * should never wait on the model.
 */
export async function bdcHandleWebsiteLead(input: WebsiteLeadInput): Promise<void> {
  const parsed = websiteLeadToParsed(input);

  if (!parsed.contactable) {
    await addEvent(input.leadId, "bdc_skipped", "no phone or email on the lead");
    return;
  }

  try {
    // Stamp the BDC fields so the console shows the thread and the reply box.
    await markBdcFields(input.leadId, parsed);
    const result = await runFirstTouch(input.leadId, parsed);
    console.log(`[bdc/website] lead=${input.leadId} → ${result.status}`);
  } catch (err) {
    console.error("[bdc/website] first touch failed:", err);
    await addEvent(input.leadId, "bdc_error", err instanceof Error ? err.message : "unknown");
  }
}

/** Website leads are inserted by /api/leads, so fill in the BDC columns here. */
async function markBdcFields(leadId: string, parsed: ParsedInboundLead): Promise<void> {
  const { getSupabaseAdmin } = await import("@/lib/supabase");
  await getSupabaseAdmin()
    .from("leads")
    .update({
      source: "website",
      external_id: parsed.external_id,
      reply_channel: parsed.reply_channel,
      reply_target: parsed.reply_target,
    })
    .eq("id", leadId);
  await setBdcStatus(leadId, "new");
}
