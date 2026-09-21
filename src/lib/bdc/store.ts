/**
 * BDC persistence — leads, per-lead message threads, and texted-in attachments.
 * Mirrors the graceful-degradation pattern in /api/leads and /api/chat: when
 * Supabase isn't configured, calls no-op safely and say so, so the loop never
 * throws just because the DB is absent in a given environment.
 */
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { ParsedInboundLead, ReplyChannel } from "@/types/bdc";
import type { LeadType } from "@/types/lead";
import type { ThreadTurn } from "./replyEngine";

const ATTACHMENT_BUCKET = "bdc-attachments";

export function hasDb(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface LeadRecord {
  id: string;
  isNew: boolean;
  opted_out: boolean;
}

/**
 * Find the lead for this inbound marketplace message, or create it. Dedupes on
 * (source, external_id) so a redelivered email never spawns a second thread or
 * a second first-touch text.
 */
export async function findOrCreateLead(lead: ParsedInboundLead): Promise<LeadRecord | null> {
  if (!hasDb()) return null;
  const supabase = getSupabaseAdmin();

  if (lead.external_id) {
    const { data: existing } = await supabase
      .from("leads")
      .select("id, opted_out")
      .eq("source", lead.source)
      .eq("external_id", lead.external_id)
      .limit(1)
      .maybeSingle();
    if (existing) {
      const row = existing as { id: string; opted_out: boolean | null };
      return { id: row.id, isNew: false, opted_out: Boolean(row.opted_out) };
    }
  }

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert({
      first_name: lead.first_name ?? "Marketplace Lead",
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      vin: lead.vin,
      stock_number: lead.stock_number,
      message: lead.message,
      lead_type: lead.suggested_lead_type,
      source: lead.source,
      external_id: lead.external_id,
      reply_channel: lead.reply_channel,
      reply_target: lead.reply_target,
      source_url: lead.external_url,
      dc_pushed: false,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[bdc/store] lead insert failed:", error?.message);
    return null;
  }
  return { id: (inserted as { id: string }).id, isNew: true, opted_out: false };
}

/**
 * A stranger texted the dealership line. Create a lead so the message lands
 * somewhere a human can see it, rather than vanishing. Name is unknown until
 * they tell us, so the thread carries the number.
 */
export async function createLeadFromText(phone: string, firstMessage: string): Promise<string | null> {
  if (!hasDb() || !phone) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("leads")
    .insert({
      first_name: "Text-in",
      last_name: null,
      phone,
      message: firstMessage || null,
      lead_type: "inquiry",
      source: "text_in",
      external_id: `text:${phone}`,
      reply_channel: "sms",
      reply_target: phone,
      bdc_status: "new",
      dc_pushed: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[bdc/store] text-in lead insert failed:", error?.message);
    return null;
  }
  return (data as { id: string }).id;
}

/** Find an existing lead by the phone/email/relay that just contacted us. */
export async function findLeadByContact(contact: string): Promise<{ id: string; opted_out: boolean } | null> {
  if (!hasDb() || !contact) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("leads")
    .select("id, opted_out")
    .or(`reply_target.eq.${contact},phone.eq.${contact},email.eq.${contact}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; opted_out: boolean | null };
  return { id: row.id, opted_out: Boolean(row.opted_out) };
}

export interface LogMessageInput {
  lead_id: string;
  direction: "outbound" | "inbound";
  channel: string;
  body: string | null;
  sent?: boolean;
  skip_reason?: string | null;
  provider_sid?: string | null;
}

/** Append one message to a lead's thread; returns the new message id. */
export async function logMessage(input: LogMessageInput): Promise<string | null> {
  if (!hasDb()) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bdc_messages")
    .insert({
      lead_id: input.lead_id,
      direction: input.direction,
      channel: input.channel,
      body: input.body,
      sent: input.sent ?? true,
      skip_reason: input.skip_reason ?? null,
      provider_sid: input.provider_sid ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[bdc/store] logMessage failed:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

export async function addEvent(lead_id: string, event_type: string, notes?: string): Promise<void> {
  if (!hasDb()) return;
  const supabase = getSupabaseAdmin();
  await supabase.from("lead_events").insert({ lead_id, event_type, notes: notes ?? null });
}

/**
 * File an appointment the customer agreed to in the BDC thread. Always saved
 * UNCONFIRMED — Ryan or Dawn confirms it on the Appointments screen, so the
 * bot can never fill the calendar on its own.
 */
export async function createAppointmentRequest(input: {
  lead_id: string;
  vehicle_id?: string | null;
  preferred_date: string;
  preferred_time: string;
  notes?: string | null;
}): Promise<boolean> {
  if (!hasDb()) return false;
  const { error } = await getSupabaseAdmin().from("appointments").insert({
    lead_id: input.lead_id,
    vehicle_id: input.vehicle_id ?? null,
    preferred_date: input.preferred_date,
    preferred_time: input.preferred_time,
    confirmed: false,
    notes: input.notes ?? "Booked by the BDC from the text thread — needs confirming.",
  });
  if (error) {
    console.error("[bdc/store] appointment insert failed:", error.message);
    return false;
  }
  return true;
}

/** Current BDC status for a lead ("manual" means a human took the wheel). */
export async function getBdcStatus(lead_id: string): Promise<string | null> {
  if (!hasDb()) return null;
  const { data } = await getSupabaseAdmin()
    .from("leads")
    .select("bdc_status")
    .eq("id", lead_id)
    .maybeSingle();
  return (data as { bdc_status?: string } | null)?.bdc_status ?? null;
}

export async function setBdcStatus(lead_id: string, status: string): Promise<void> {
  if (!hasDb()) return;
  await getSupabaseAdmin().from("leads").update({ bdc_status: status }).eq("id", lead_id);
}

/** Mark a lead opted-out (STOP). Idempotent. */
export async function setOptedOut(lead_id: string): Promise<void> {
  if (!hasDb()) return;
  await getSupabaseAdmin()
    .from("leads")
    .update({ opted_out: true, bdc_status: "opted_out" })
    .eq("id", lead_id);
}

/** The lead fields the BDC needs to rebuild context for a follow-up. */
export interface BdcLeadContext extends ParsedInboundLead {
  id: string;
  opted_out: boolean;
}

/**
 * Load a lead as a ParsedInboundLead (plus id + opted_out) so the reply engine
 * can rebuild its context for a follow-up. Vehicle re-matching uses the stored
 * vin/stock_number/message.
 */
export async function getBdcLead(leadId: string): Promise<BdcLeadContext | null> {
  if (!hasDb()) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, vin, stock_number, message, source, external_id, source_url, reply_channel, reply_target, opted_out, lead_type")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;

  return {
    id: String(row.id),
    opted_out: Boolean(row.opted_out),
    source: (row.source as ParsedInboundLead["source"]) ?? "unknown",
    received_at: null,
    first_name: (row.first_name as string) ?? null,
    last_name: (row.last_name as string) ?? null,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    vin: (row.vin as string) ?? null,
    stock_number: (row.stock_number as string) ?? null,
    vehicle_title: null,
    listed_price: null,
    message: (row.message as string) ?? null,
    external_id: (row.external_id as string) ?? null,
    external_url: (row.source_url as string) ?? null,
    reply_channel: ((row.reply_channel as ReplyChannel) ?? "sms"),
    reply_target: (row.reply_target as string) ?? (row.phone as string) ?? (row.email as string) ?? null,
    suggested_lead_type: ((row.lead_type as LeadType) ?? "inquiry"),
    vehicle_present: Boolean(row.vin || row.stock_number),
    contactable: Boolean(row.reply_target || row.phone || row.email),
    warnings: [],
  };
}

/** Load a lead's conversation thread, oldest first, as reply-engine turns. */
export async function getThread(leadId: string): Promise<ThreadTurn[]> {
  if (!hasDb()) return [];
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("bdc_messages")
    .select("direction, body")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as { direction: "inbound" | "outbound"; body: string | null }[]).map((m) => ({
    direction: m.direction,
    body: m.body,
  }));
}

/**
 * Download a media URL (optionally with Basic auth, as Twilio media requires)
 * and file it into the private bucket + bdc_attachments, linked to the lead.
 */
export async function saveAttachmentFromUrl(args: {
  lead_id: string;
  message_id: string | null;
  url: string;
  contentType?: string;
  authHeader?: string;
}): Promise<string | null> {
  if (!hasDb()) return null;
  try {
    const res = await fetch(args.url, args.authHeader ? { headers: { Authorization: args.authHeader } } : undefined);
    if (!res.ok) {
      console.error(`[bdc/store] media fetch ${res.status} for ${args.url}`);
      return null;
    }
    const contentType = args.contentType || res.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = contentType.split("/")[1]?.split(";")[0]?.replace(/[^a-z0-9]/gi, "") || "bin";
    // Timestamp is provided by the DB elsewhere; here we build a unique-ish name
    // from the message id (or a random-free counter is unnecessary — the storage
    // path only needs to be unique per lead, and message_id already is).
    const filename = `${args.message_id ?? "media"}.${ext}`;
    const storage_path = `${args.lead_id}/${filename}`;

    const supabase = getSupabaseAdmin();
    const { error: upErr } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(storage_path, buf, { contentType, upsert: true });
    if (upErr) {
      console.error("[bdc/store] attachment upload failed:", upErr.message);
      return null;
    }

    await supabase.from("bdc_attachments").insert({
      lead_id: args.lead_id,
      message_id: args.message_id,
      storage_path,
      content_type: contentType,
      filename,
    });
    return storage_path;
  } catch (err) {
    console.error("[bdc/store] saveAttachmentFromUrl failed", err);
    return null;
  }
}
