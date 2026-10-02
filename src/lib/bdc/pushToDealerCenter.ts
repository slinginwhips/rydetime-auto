/**
 * Send a BDC-created lead (marketplace email or cold text) into DealerCenter's
 * CRM over the same ADF route the website forms use, and record the result on
 * the lead so dc_pushed stays honest.
 *
 * Best-effort: a DealerCenter failure never stops the BDC from answering the
 * customer. Leads left dc_pushed=false can be retried from
 * /api/admin/bdc/push-dealercenter.
 */
import { getSupabaseAdmin } from "@/lib/supabase";
import { getLeadProvider } from "@/lib/leadProvider";
import { hasDb, addEvent } from "./store";

const SOURCE_LABELS: Record<string, string> = {
  cargurus: "CarGurus",
  carfax: "Carfax",
  offerup: "OfferUp",
  caps: "Credit Acceptance CAPS",
  text_in: "Text to dealership line",
  website: "Website",
};

export async function pushLeadToDealerCenter(leadId: string): Promise<boolean> {
  if (!hasDb()) return false;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("leads")
    .select("first_name, last_name, email, phone, vin, stock_number, message, lead_type, source, source_url, dc_pushed")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return false;
  const row = data as Record<string, string | null | boolean>;
  if (row.dc_pushed) return true;

  const source = (row.source as string) || "bdc";
  const label = SOURCE_LABELS[source] ?? source;
  const comments = [
    `Lead source: ${label}`,
    row.message ? `Customer message: ${row.message}` : null,
    row.source_url ? `Link: ${row.source_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await getLeadProvider().pushLead({
      first_name: (row.first_name as string) || "Unknown",
      last_name: (row.last_name as string) || undefined,
      email: (row.email as string) || undefined,
      phone: (row.phone as string) || undefined,
      vin: (row.vin as string) || undefined,
      stock_number: (row.stock_number as string) || undefined,
      comments,
      lead_type: (row.lead_type as string) || "inquiry",
      source: label,
    });
    if (result.success) {
      await supabase.from("leads").update({ dc_pushed: true, dc_pushed_at: new Date().toISOString() }).eq("id", leadId);
      await addEvent(leadId, "dc_pushed", `method=${result.method}`);
      return true;
    }
    await addEvent(leadId, "dc_push_failed", result.error ?? result.method);
  } catch (err) {
    await addEvent(leadId, "dc_push_failed", err instanceof Error ? err.message : "unknown");
  }
  return false;
}
