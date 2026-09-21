/**
 * Act on the control tags the reply engine pulled out of a draft:
 *   - an agreed appointment → filed UNCONFIRMED on the Appointments screen
 *   - "I can't answer this"  → lead flagged + Ryan and Dawn both alerted
 *
 * Shared by first-touch (handleInboundLead) and follow-ups (/api/bdc/sms) so
 * the two paths can never drift. Best-effort: a failure here must never stop
 * the customer's message from going out.
 */
import { createAppointmentRequest, addEvent, setBdcStatus, setLeadNameIfUnknown } from "./store";
import { cleanPersonName, isPlaceholderName } from "./names";
import { alertStaff } from "./escalate";
import type { DraftedReply } from "./replyEngine";
import type { ParsedInboundLead } from "@/types/bdc";

export async function applyDraftTags(
  leadId: string,
  draft: DraftedReply,
  lead: Pick<ParsedInboundLead, "first_name" | "last_name" | "phone" | "email">,
  lastCustomerMessage: string | null
): Promise<void> {
  if (draft.customer_name && isPlaceholderName(lead.first_name)) {
    const name = cleanPersonName(draft.customer_name);
    if (name && (await setLeadNameIfUnknown(leadId, name.first, name.last))) {
      await addEvent(leadId, "name_captured", [name.first, name.last].filter(Boolean).join(" "));
    }
  }

  if (draft.appointment) {
    const ok = await createAppointmentRequest({
      lead_id: leadId,
      vehicle_id: draft.matched_vehicle?.id ?? null,
      preferred_date: draft.appointment.date,
      preferred_time: draft.appointment.time,
    });
    await addEvent(
      leadId,
      ok ? "appointment_requested" : "appointment_failed",
      `${draft.appointment.date} ${draft.appointment.time}${draft.matched_vehicle ? ` — ${draft.matched_vehicle.year} ${draft.matched_vehicle.make} ${draft.matched_vehicle.model}` : ""}`
    );
  }

  if (draft.needs_human) {
    await setBdcStatus(leadId, "needs_human");
    await addEvent(leadId, "bdc_needs_human", draft.needs_human);
    try {
      const sent = await alertStaff({
        leadId,
        customerName: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || null,
        customerContact: lead.phone || lead.email || null,
        reason: draft.needs_human,
        lastMessage: lastCustomerMessage,
      });
      if (sent.sms === 0 && sent.email === 0) {
        await addEvent(leadId, "bdc_alert_failed", "nobody was reachable — check BDC_ALERT_PHONES / BDC_ALERT_EMAILS");
      }
    } catch (err) {
      console.error("[bdc] staff alert failed:", err);
    }
  }
}
