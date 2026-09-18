/**
 * BDC reply engine — drafts the automatic first-touch message for an inbound
 * marketplace lead. It reuses the SAME dealership brain as the website chat
 * (dealership facts + inventory + knowledge base) so the BDC speaks in one
 * voice with real inventory, and it never invents vehicle details or promises
 * financing (same guardrails as src/app/api/chat/route.ts).
 *
 * This module only DRAFTS. Sending happens in the dispatch layer.
 */
import { getAnthropic, AI_MODEL, isAIConfigured } from "@/lib/ai";
import { getAllActiveVehicles } from "@/lib/vehicles";
import { matchVehiclesToQuery, formatVehicleKnowledge, retrieveKnowledge } from "@/lib/chatRetrieval";
import { DEALERSHIP } from "@/lib/dealership";
import type { Vehicle } from "@/types/vehicle";
import type { ParsedInboundLead, ReplyChannel } from "@/types/bdc";

export interface DraftedReply {
  channel: ReplyChannel;
  /** Phone (E.164), email, or OfferUp relay address the message goes to. */
  target: string | null;
  /** Subject line for email / relay channels; null for SMS. */
  subject: string | null;
  /** The message body, ready to send (SMS already carries its compliance tail). */
  body: string;
  /** Deep link to the matched vehicle, or the inventory page when unmatched. */
  link: string | null;
  /** The inventory vehicle we tied the lead to, if any. */
  matched_vehicle: Vehicle | null;
  model: string;
}

/** Every A2P first-touch SMS ends with this — business ID lives in the body. */
const SMS_OPT_OUT = "Reply STOP to opt out.";

const BDC_SYSTEM_PROMPT = `You are the RydeTime Auto BDC (business development center) rep sending the FIRST message to a customer who just submitted a lead on a car-shopping site. RydeTime Auto is a used-car dealership in Suffolk, VA (Hampton Roads).

Your goal: get a real reply and move toward a test drive or a call. Sound like a real, friendly salesperson — warm, brief, human. Not corporate, not pushy, no emojis unless it feels natural (at most one).

HARD RULES:
- Use ONLY the facts provided (dealership info, the matched vehicle, knowledge). NEVER invent vehicle details, mileage, history, or availability.
- NEVER promise or guarantee financing approval, a rate, or a monthly payment. You can say we work with many lenders and can likely help.
- NEVER ask for SSN, date of birth, or full financial details.
- If the customer's car is known, reference it specifically by year/make/model.
- If NO specific car is known, warmly ask which vehicle they were looking at (or what they're shopping for) and point them to our inventory to browse.
- Always identify yourself as being with RydeTime Auto in the first message.
- Keep it genuinely short. Do NOT add a signature block, "Best regards," or a footer — just the message.
- Do NOT include any opt-out language like "Reply STOP" — that is appended automatically.

CREDIT APP / FINANCING FOLLOW-UP (only when income, financing, or a credit application is relevant — e.g. a financing/credit lead, or the customer brings it up; NEVER on a simple "is this available?" text):
Let them know, naturally and briefly, that they can speed up approval by texting documents right here — and that anything they send goes straight onto their file:
- Proof of income — most recent paystub, last 3 months of bank statements, a Social Security award letter, or a child support letter.
- Proof of residence — a phone, electric, or water bill, or a bank statement, dated within the last 30 days.
Keep it light — mention it as a helpful next step, not a checklist dump.

Output ONLY the message text to send. No preamble, no quotes, no labels.`;

/** Find the inventory vehicle this lead is about, by stock #, VIN, then title. */
function resolveVehicle(lead: ParsedInboundLead, inventory: Vehicle[]): Vehicle | null {
  if (lead.stock_number) {
    const byStock = inventory.find(
      (v) => v.stock_number?.toLowerCase() === lead.stock_number!.toLowerCase()
    );
    if (byStock) return byStock;
  }
  if (lead.vin) {
    const byVin = inventory.find((v) => v.vin?.toLowerCase() === lead.vin!.toLowerCase());
    if (byVin) return byVin;
  }
  if (lead.vehicle_title) {
    const matched = matchVehiclesToQuery(lead.vehicle_title, inventory, 1);
    if (matched.length > 0) return matched[0];
  }
  return null;
}

/** Compact channel guidance handed to the model per send rail. */
function channelGuidance(channel: ReplyChannel): string {
  switch (channel) {
    case "sms":
      return "Channel: SMS text. Keep it under ~300 characters, one clear question or next step. Conversational, like a real text.";
    case "offerup_relay":
      return "Channel: OfferUp marketplace message (replying in-thread). Short and casual, like a marketplace chat. No email formatting.";
    case "email":
    default:
      return "Channel: email. A short friendly paragraph or two is fine, but stay tight and skimmable.";
  }
}

function customerLabel(lead: ParsedInboundLead): string {
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "there";
}

/** Build the lead + inventory context block for the model. */
function buildLeadContext(lead: ParsedInboundLead, vehicle: Vehicle | null, link: string | null): string {
  const hours = DEALERSHIP.hours.map((h) => `${h.days}: ${h.hours}`).join(" | ");
  const parts: string[] = [
    `DEALERSHIP: ${DEALERSHIP.name}, ${DEALERSHIP.address.full}. Phone: ${DEALERSHIP.phone}. Hours: ${hours}.`,
    `LEAD SOURCE: ${lead.source}`,
    `CUSTOMER NAME: ${customerLabel(lead)}`,
    lead.message ? `WHAT THEY SAID / LEAD NOTE: ${lead.message}` : "The lead carried no message from the customer.",
  ];

  if (vehicle) {
    parts.push(`MATCHED VEHICLE (confirmed detail — reference this specifically):\n${formatVehicleKnowledge(vehicle)}`);
    if (link) parts.push(`LINK TO THAT VEHICLE: ${link}`);
  } else {
    parts.push(
      `NO SPECIFIC VEHICLE is attached to this lead. Ask which car they were looking at (or what they want), and invite them to browse our inventory.`
    );
    if (link) parts.push(`INVENTORY LINK: ${link}`);
  }

  // Pull in relevant dealership knowledge (financing, etc.) for grounding.
  const knowledge = retrieveKnowledge([lead.message, lead.source === "credit_acceptance" ? "financing credit approval" : ""].filter(Boolean).join(" "));
  if (knowledge.length > 0) {
    parts.push(
      `DEALERSHIP KNOWLEDGE (answer only from this, never invent policy):\n${knowledge.map((k) => `## ${k.topic}\n${k.text}`).join("\n\n")}`
    );
  }

  return parts.join("\n\n");
}

/** Everything needed to send, EXCEPT the model-written body. Pure + testable. */
export interface ReplyPlan {
  channel: ReplyChannel;
  target: string | null;
  subject: string | null;
  link: string | null;
  matched_vehicle: Vehicle | null;
  /** System prompt handed to the model. */
  system: string;
  /** User message (channel guidance + lead context) handed to the model. */
  userMessage: string;
}

function subjectFor(lead: ParsedInboundLead, vehicle: Vehicle | null): string | null {
  if (lead.reply_channel === "email") {
    return vehicle
      ? `RydeTime Auto — your ${vehicle.year} ${vehicle.make} ${vehicle.model} inquiry`
      : `RydeTime Auto — following up on your inquiry`;
  }
  if (lead.reply_channel === "offerup_relay" && lead.vehicle_title) {
    return `Re: ${lead.vehicle_title}`;
  }
  return null;
}

/**
 * Build the full send plan for a lead against a given inventory — no I/O, no
 * model call. This is the deterministic half of the BDC reply, so it can be
 * unit-tested offline; only the message body needs the model.
 */
export function planReply(lead: ParsedInboundLead, inventory: Vehicle[]): ReplyPlan {
  const vehicle = resolveVehicle(lead, inventory);
  const link = vehicle
    ? `${DEALERSHIP.siteUrl}/inventory/${vehicle.slug}`
    : `${DEALERSHIP.siteUrl}/inventory`;
  const context = buildLeadContext(lead, vehicle, link);
  const guidance = channelGuidance(lead.reply_channel);

  return {
    channel: lead.reply_channel,
    target: lead.reply_target,
    subject: subjectFor(lead, vehicle),
    link,
    matched_vehicle: vehicle,
    system: BDC_SYSTEM_PROMPT,
    userMessage: `${guidance}\n\n${context}\n\nWrite the first message to ${customerLabel(lead)} now.`,
  };
}

/** A2P: the first SMS must carry an opt-out (business ID is already in the body). */
export function applySmsCompliance(body: string, channel: ReplyChannel): string {
  if (channel === "sms" && !/reply stop/i.test(body)) {
    return `${body}\n\n${SMS_OPT_OUT}`;
  }
  return body;
}

/**
 * Draft (but do not send) the first-touch reply for a parsed lead. Throws if AI
 * isn't configured so the caller can fall back to a human alert rather than
 * sending nothing.
 */
export async function draftFirstTouch(lead: ParsedInboundLead): Promise<DraftedReply> {
  if (!isAIConfigured()) {
    throw new Error("ANTHROPIC_API_KEY not configured — cannot draft BDC reply.");
  }

  const inventory = await getAllActiveVehicles();
  const plan = planReply(lead, inventory);

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    system: plan.system,
    messages: [{ role: "user", content: plan.userMessage }],
  });

  const raw = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return {
    channel: plan.channel,
    target: plan.target,
    subject: plan.subject,
    body: applySmsCompliance(raw, plan.channel),
    link: plan.link,
    matched_vehicle: plan.matched_vehicle,
    model: AI_MODEL,
  };
}

// ---------------------------------------------------------------------------
// Two-way conversation (follow-up replies)
// ---------------------------------------------------------------------------

/** One prior message in the thread, oldest first. */
export interface ThreadTurn {
  direction: "inbound" | "outbound";
  body: string | null;
}

const BDC_FOLLOWUP_SYSTEM_PROMPT = `You are the RydeTime Auto BDC rep, continuing an ONGOING text conversation with a customer (you already introduced yourself earlier). RydeTime Auto is a used-car dealership in Suffolk, VA.

Your goal: answer their latest message helpfully and move things forward — toward a test drive, a visit, or (if they're financing) the credit application. Sound like a real, friendly salesperson. Brief and human, like a text.

HARD RULES:
- Use ONLY the facts provided (dealership info, the matched vehicle, knowledge, and the conversation so far). NEVER invent vehicle details, mileage, history, or availability.
- NEVER promise or guarantee financing approval, a rate, or a monthly payment. You can say we work with many lenders and can likely help.
- NEVER ask for SSN, date of birth, or full financial details over text.
- If they ask something you don't have the facts for, say you'll check with the team / invite them to call ${DEALERSHIP.phone}.
- Do NOT re-introduce yourself every message, do NOT add a signature or footer, and do NOT include "Reply STOP".
- If financing/credit is in play, you may remind them they can text in proof of income (paystub, 3 months of bank statements, SS award letter, or child-support letter) or proof of residence (a utility bill or bank statement dated within 30 days), and that it goes right onto their file.

Output ONLY the next message to send. No preamble, no quotes, no labels.`;

/**
 * Draft the next reply in an ongoing conversation, grounded in the thread so
 * far plus the same dealership brain. No opt-out tail (that's first-touch only);
 * STOP is always honored separately.
 */
export async function draftFollowUp(
  lead: ParsedInboundLead,
  history: ThreadTurn[]
): Promise<DraftedReply> {
  if (!isAIConfigured()) {
    throw new Error("ANTHROPIC_API_KEY not configured — cannot draft BDC follow-up.");
  }

  const inventory = await getAllActiveVehicles();
  const vehicle = resolveVehicle(lead, inventory);
  const link = vehicle
    ? `${DEALERSHIP.siteUrl}/inventory/${vehicle.slug}`
    : `${DEALERSHIP.siteUrl}/inventory`;

  const context = buildLeadContext(lead, vehicle, link);
  const transcript = history
    .filter((t) => t.body && t.body.trim())
    .map((t) => `${t.direction === "inbound" ? "Customer" : "You (RydeTime)"}: ${t.body}`)
    .join("\n");

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    system: `${BDC_FOLLOWUP_SYSTEM_PROMPT}\n\n${context}\n\nCONVERSATION SO FAR:\n${transcript}`,
    messages: [
      { role: "user", content: "Write your next reply to the customer's most recent message now. Keep it short and human." },
    ],
  });

  const body = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return {
    channel: lead.reply_channel,
    target: lead.reply_target,
    subject: subjectFor(lead, vehicle),
    body,
    link,
    matched_vehicle: vehicle,
    model: AI_MODEL,
  };
}
