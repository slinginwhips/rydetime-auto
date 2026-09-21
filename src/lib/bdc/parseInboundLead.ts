import type { LeadSource, ParsedInboundLead, ReplyChannel } from "@/types/bdc";
import type { LeadType } from "@/types/lead";
import { parseEmail, type ParsedEmail } from "./emailParser";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** First non-null capture of `re` against `text`, trimmed. */
function grab(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m && m[1] ? m[1].trim() : null;
}

/** Capture the slice between a start label and the first of several enders. */
function between(text: string, start: string, ends: string[]): string | null {
  const endAlt = ends.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`${start}\\s*([\\s\\S]*?)(?=${endAlt}|$)`, "i");
  const m = text.match(re);
  return m && m[1] ? m[1].trim() : null;
}

/** US phone -> E.164, or null if it isn't a plausible 10/11-digit number. */
function toE164(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Split a full name into first + last (last may be null). */
function splitName(full: string | null): { first: string | null; last: string | null } {
  if (!full) return { first: null, last: null };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function domainOf(addr: string | null): string {
  if (!addr) return "";
  const m = addr.match(/@([^>\s]+)/);
  return (m ? m[1] : addr).toLowerCase();
}

// ---------------------------------------------------------------------------
// Source detection
// ---------------------------------------------------------------------------

export function detectSource(email: ParsedEmail): LeadSource {
  const haystack = [
    domainOf(email.from),
    domainOf(email.returnPath),
    email.from || "",
    email.headers["list-id"] || "",
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("cargurus.com")) return "cargurus";
  if (haystack.includes("carfax.com")) return "carfax";
  if (haystack.includes("offerup.com")) return "offerup";
  if (haystack.includes("creditacceptance.com")) return "credit_acceptance";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Normalized-lead assembly
// ---------------------------------------------------------------------------

interface Extracted {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null; // display form; E.164 conversion happens in finalize()
  vin: string | null;
  stock_number: string | null;
  vehicle_title: string | null;
  listed_price: string | null;
  message: string | null;
  external_id: string | null;
  external_url: string | null;
  reply_channel: ReplyChannel;
  reply_target: string | null; // may be filled in finalize() from phone/email
  suggested_lead_type: LeadType;
}

function finalize(
  source: LeadSource,
  receivedAt: string | null,
  x: Extracted
): ParsedInboundLead {
  const phoneE164 = toE164(x.phone);
  const phone = phoneE164 ?? x.phone;

  // Resolve the concrete reply target for the chosen channel.
  let reply_target = x.reply_target;
  if (!reply_target) {
    if (x.reply_channel === "sms") reply_target = phone;
    else if (x.reply_channel === "email") reply_target = x.email;
  }

  const vehicle_present = Boolean(x.vin || x.vehicle_title || x.stock_number);
  const contactable =
    Boolean(phone || x.email) ||
    (x.reply_channel === "offerup_relay" && Boolean(reply_target));

  const warnings: string[] = [];
  if (!vehicle_present) {
    warnings.push("No vehicle on the lead — ask which car and send an inventory link.");
  }
  if (!phone) {
    if (x.email) warnings.push("No phone number — email only, can't text.");
    else if (x.reply_channel === "offerup_relay") warnings.push("No phone/email — reply through OfferUp relay only.");
  }
  if (source === "credit_acceptance") {
    warnings.push("Pre-qualified financing lead, shared with other dealers — respond fast.");
  }
  if (!contactable) {
    warnings.push("No usable contact info — needs manual review.");
  }

  return {
    source,
    received_at: receivedAt,
    first_name: x.first_name,
    last_name: x.last_name,
    email: x.email,
    phone,
    vin: x.vin,
    stock_number: x.stock_number,
    vehicle_title: x.vehicle_title,
    listed_price: x.listed_price,
    message: x.message,
    external_id: x.external_id,
    external_url: x.external_url,
    reply_channel: reply_target ? x.reply_channel : "none",
    reply_target,
    suggested_lead_type: x.suggested_lead_type,
    vehicle_present,
    contactable,
    warnings,
  };
}

function receivedAtIso(email: ParsedEmail): string | null {
  if (!email.date) return null;
  const d = new Date(email.date);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// Per-source extractors
// ---------------------------------------------------------------------------

function fromCarGurus(email: ParsedEmail): ParsedInboundLead {
  const t = email.text;
  const emailAddr = grab(t, /Email:\s*(\S+@\S+)/i) || email.replyTo;
  return finalize(
    "cargurus",
    receivedAtIso(email),
    {
      first_name: grab(t, /First Name:\s*(.+)/i),
      last_name: grab(t, /Last Name:\s*(.+)/i),
      email: emailAddr && /@/.test(emailAddr) ? emailAddr.replace(/[.,]$/, "") : null,
      phone: grab(t, /Telephone:\s*(.+)/i),
      vin: grab(t, /VIN:\s*(\S+)/i),
      stock_number: grab(t, /Stock Number:\s*(\S+)/i),
      vehicle_title: grab(t, /Vehicle:\s*(.+)/i),
      listed_price: grab(t, /Listed Price:\s*(\$[\d,]+)/i),
      message: between(t, "Comments:", ["\nListing:", "\nSeller:"]),
      external_id: grab(t, /Transaction ID:\s*(\S+)/i),
      external_url: grab(t, /View Listing on CarGurus\s*\[(https?:\/\/\S+?)\]/i),
      reply_channel: "sms", // has phone + email; SMS is fastest. finalize() falls back if phone missing.
      reply_target: null,
      suggested_lead_type: "inquiry",
    }
  );
}

/**
 * CARFAX sends two different lead emails:
 *  - a phone lead ("customer called about a CARFAX listing"): name + phone +
 *    recording link, and no car;
 *  - a web lead from "Check Availability" on a listing: the car
 *    (Year/Make/Model, VIN, Stock, Price), separate First/Last Name, email,
 *    phone and the customer's own comments.
 * Read whichever fields are present so neither loses the car or the contact.
 */
function fromCarfax(email: ParsedEmail): ParsedInboundLead {
  const t = email.text;
  const firstLabel = grab(t, /^First Name:\s*(.+)/im);
  const lastLabel = grab(t, /^Last Name:\s*(.+)/im);
  const { first, last } =
    firstLabel || lastLabel
      ? { first: firstLabel, last: lastLabel }
      : splitName(grab(t, /^Name:\s*(.+)/im));

  const phone = grab(t, /^Phone:\s*([\d\-().+ ]+)/im);
  const leadEmail = grab(t, /^Email:\s*(\S+@\S+)/im)?.toLowerCase() ?? null;
  const vehicleTitle = grab(t, /^Year\/Make\/Model:\s*(.+)/im);
  const vin = grab(t, /^VIN:\s*([A-HJ-NPR-Z0-9]{17})\b/im)?.toUpperCase() ?? null;
  const stock = grab(t, /^Stock:\s*(\S+)/im);
  const price = grab(t, /^Price:\s*(\$[\d,]+)/im);
  const condition = grab(t, /^Condition:\s*(.+)/im);
  const recording = grab(t, /Recording Link:\s*(\S+)/i);
  const comments = between(t, "Additional comments:", ["Lead provided by"]);
  const listing = grab(t, /^Listing:\s*(\S+)/im);

  const isPhoneLead = Boolean(recording) || !comments;
  const messageBits = [
    isPhoneLead && !vehicleTitle ? "Phone lead — customer called about a CARFAX listing." : null,
    comments ? comments.replace(/\s+/g, " ").trim() : null,
    !comments && condition ? `Condition: ${condition}` : null,
    recording ? `Call recording: ${recording}` : null,
  ].filter(Boolean);

  return finalize(
    "carfax",
    receivedAtIso(email),
    {
      first_name: first,
      last_name: last,
      email: leadEmail,
      phone,
      vin,
      stock_number: stock,
      vehicle_title: vehicleTitle,
      listed_price: price,
      message: messageBits.join(" ") || null,
      external_id: grab(t, /Lead ID:\s*(\S+)/i),
      external_url: recording ?? listing,
      // Phone first; email only when there is no number.
      reply_channel: phone ? "sms" : leadEmail ? "email" : "sms",
      reply_target: null,
      suggested_lead_type: "carfax",
    }
  );
}

function fromOfferUp(email: ParsedEmail): ParsedInboundLead {
  const t = email.text;
  const name =
    grab(t, /(\S+)\s+has sent you a message/i) ||
    (email.fromName ? email.fromName.replace(/\(OfferUp\)/i, "").trim() : null);
  const { first, last } = splitName(name);

  const vehicle =
    grab(t, /regarding\s+(.+?):/i) ||
    (email.subject ? email.subject.replace(/^re:\s*/i, "").trim() : null);

  const message = between(t, "regarding[^:]*:", ["____", "Simply reply", "To review"]);
  const price = email.html ? grab(email.html, /(\$[\d,]+\.\d{2})/) : null;
  const relay = email.replyTo || email.from;

  return finalize(
    "offerup",
    receivedAtIso(email),
    {
      first_name: first,
      last_name: last,
      email: null, // relayed — we never see the real inbox
      phone: null,
      vin: null,
      stock_number: null,
      vehicle_title: vehicle,
      listed_price: price,
      message: message,
      external_id: null,
      external_url: grab(t, /(https?:\/\/offerup\.com\/item\/\S+)/i),
      reply_channel: "offerup_relay",
      reply_target: relay,
      suggested_lead_type: "inquiry",
    }
  );
}

function fromCreditAcceptance(email: ParsedEmail): ParsedInboundLead {
  const t = email.text;
  const name = between(t, "Approval #:", ["Email:"]);
  const { first, last } = splitName(name);
  const rawEmail = between(t, "Email:", ["Phone:"]);
  const rawPhone = between(t, "Phone:", ["Pre-qualified", "Log in", "This lead"]);
  const leadNum = grab(t, /leads\/(\d+)/i);

  return finalize(
    "credit_acceptance",
    receivedAtIso(email),
    {
      first_name: first,
      last_name: last,
      email: rawEmail && /@/.test(rawEmail) ? rawEmail : null,
      phone: rawPhone,
      vin: null,
      stock_number: null,
      vehicle_title: null, // CAPS financing leads carry no specific car
      listed_price: null,
      message:
        "Pre-qualified Credit Acceptance (CAPS) lead — customer consented to a credit pull. No specific vehicle attached.",
      external_id: leadNum,
      external_url: grab(t, /(https?:\/\/ui\.creditacceptance\.com\/\S*?leads\/\d+)/i),
      reply_channel: "sms",
      reply_target: null,
      suggested_lead_type: "finance",
    }
  );
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/** Parse an already-decoded email into a normalized lead. */
export function parseInboundLeadFromEmail(email: ParsedEmail): ParsedInboundLead {
  switch (detectSource(email)) {
    case "cargurus":
      return fromCarGurus(email);
    case "carfax":
      return fromCarfax(email);
    case "offerup":
      return fromOfferUp(email);
    case "credit_acceptance":
      return fromCreditAcceptance(email);
    default:
      return finalize("unknown", receivedAtIso(email), {
        first_name: null,
        last_name: null,
        email: email.replyTo || email.from,
        phone: null,
        vin: null,
        stock_number: null,
        vehicle_title: email.subject,
        listed_price: null,
        message: email.text.slice(0, 2000),
        external_id: null,
        external_url: null,
        reply_channel: email.replyTo || email.from ? "email" : "none",
        reply_target: email.replyTo || email.from,
        suggested_lead_type: "inquiry",
      });
  }
}

/** Parse a raw .eml / MIME string into a normalized lead. */
export function parseInboundLead(rawEmail: string): ParsedInboundLead {
  const email = parseEmail(rawEmail);
  const lead = parseInboundLeadFromEmail(email);
  // Sources without their own lead id (Carfax, OfferUp) still need a stable
  // dedupe key, or a webhook retry would text the customer twice. Message-ID
  // survives Outlook redirects and provider retries.
  const messageId = email.headers["message-id"]?.trim();
  if (!lead.external_id && messageId) {
    return { ...lead, external_id: `msgid:${messageId.slice(0, 200)}` };
  }
  return lead;
}
