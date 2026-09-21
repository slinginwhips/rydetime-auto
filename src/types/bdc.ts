import type { LeadType } from "./lead";

/**
 * Third-party lead marketplaces we ingest by email. Every one of these sends a
 * differently-shaped message (none are ADF/XML), so each has its own extractor
 * in src/lib/bdc/parseInboundLead.ts, keyed off the sending domain.
 */
export type LeadSource =
  | "cargurus"
  | "carfax"
  | "offerup"
  | "credit_acceptance"
  /** Our own site forms (contact, test drive, trade, finance, chat, hold). */
  | "website"
  | "unknown";

/**
 * How the BDC should reach this customer back. Chosen per source, because the
 * contact rails differ:
 *  - sms:           we have a real mobile number (CarGurus, Carfax, CAPS)
 *  - email:         we have a real inbox and can write to it directly
 *  - offerup_relay: no phone/email — we can only answer by replying to OfferUp's
 *                   relay address, which forwards to the buyer in-thread
 *  - none:          nothing usable was found (should never happen — flag it)
 */
export type ReplyChannel = "sms" | "email" | "offerup_relay" | "none";

/**
 * A lead after parsing, normalized across all sources. EVERY field except the
 * source and the warnings array can be null — real leads come in half-empty
 * (missing the car, missing the phone, etc.). The contract the BDC relies on:
 * there is always a name and at least one contact rail, or `contactable` is
 * false and a warning explains why.
 */
export interface ParsedInboundLead {
  source: LeadSource;
  /** When the marketplace says the lead was submitted (ISO), if stated. */
  received_at: string | null;

  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;

  // Vehicle of interest — any or all may be missing.
  vin: string | null;
  stock_number: string | null;
  /** Human-readable "1997 Ford F-150 STD Extended Cab SB". */
  vehicle_title: string | null;
  listed_price: string | null;

  /** The customer's own words, when the lead carries a message. */
  message: string | null;

  /** Provider's own id for the lead (Lead ID, Transaction ID, CAPS lead id). */
  external_id: string | null;
  /** Listing / item / deal URL back on the provider, when present. */
  external_url: string | null;

  reply_channel: ReplyChannel;
  /** The concrete address/number the reply_channel sends to. */
  reply_target: string | null;

  /** Best-fit LeadType for our existing pipeline. */
  suggested_lead_type: LeadType;

  vehicle_present: boolean;
  contactable: boolean;
  /**
   * Non-fatal gaps worth surfacing to the BDC/dealer, e.g.
   * "no vehicle on lead — ask which car" or "no phone number".
   */
  warnings: string[];
}
