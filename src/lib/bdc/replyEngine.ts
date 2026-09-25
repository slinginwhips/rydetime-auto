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
import { isPlaceholderName } from "./names";
import { matchVehiclesToQuery, formatVehicleKnowledge, retrieveKnowledge } from "@/lib/chatRetrieval";
import { DEALERSHIP } from "@/lib/dealership";
import { getCarfaxProvider } from "@/lib/carfaxProvider";
import { hoursContext, isOpenAt, isWithinHours, nextOpenDescription } from "./hours";
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
  /** Parsed from the model's control tags (stripped from the body). */
  appointment?: { date: string; time: string } | null;
  needs_human?: string | null;
  /** A name the customer gave while filed as Unknown, from the [[NAME:]] tag. */
  customer_name?: string | null;
}

/**
 * The model may end a message with control tags, which are stripped before the
 * customer ever sees them:
 *   [[APPT: YYYY-MM-DD HH:MM]]  — the customer agreed to a time
 *   [[NEEDS_HUMAN: reason]]     — it could not answer and promised a callback
 */
export interface ReplyTags {
  appointment: { date: string; time: string } | null;
  needsHuman: string | null;
  /** A name the customer gave us while we had them filed as "Unknown". */
  name: string | null;
}

/**
 * Em and en dashes are the tell-tale sign of AI-written text, so a customer
 * never sees one: the prompts ask the model not to use them, and this cleans up
 * whatever slips through ("10–6" becomes "10-6", " — " becomes a comma).
 */
export function stripDashes(text: string): string {
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2")
    .replace(/(\w)[–—](\w)/g, "$1-$2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",");
}

export function extractTags(raw: string): { body: string; tags: ReplyTags } {
  const tags: ReplyTags = { appointment: null, needsHuman: null, name: null };

  const appt = /\[\[APPT:\s*(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*\]\]/i.exec(raw);
  if (appt) tags.appointment = { date: appt[1], time: appt[2] };

  const human = /\[\[NEEDS_HUMAN:\s*([^\]]*)\]\]/i.exec(raw);
  if (human) tags.needsHuman = human[1].trim() || "unspecified";

  const nameTag = /\[\[NAME:\s*([^\]]*)\]\]/i.exec(raw);
  if (nameTag) tags.name = nameTag[1].trim() || null;

  const body = stripDashes(
    raw
      .replace(/\[\[(APPT|NEEDS_HUMAN|NAME):[^\]]*\]\]/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );

  return { body, tags };
}


/**
 * A time the model tagged only counts if we are actually open then — it has
 * the hours in its prompt, but a booked-when-closed appointment would strand
 * a customer at a locked door.
 */
function validAppointment(
  appt: { date: string; time: string } | null
): { date: string; time: string } | null {
  if (!appt) return null;
  return isWithinHours(appt.date, appt.time) ? appt : null;
}

/** Every A2P first-touch SMS ends with this — business ID lives in the body. */
const SMS_OPT_OUT = "Reply STOP to opt out.";

const BDC_SYSTEM_PROMPT = `You are the RydeTime Auto BDC (business development center) rep sending the FIRST message to a customer who just submitted a lead on a car-shopping site. RydeTime Auto is a used-car dealership in Suffolk, VA (Hampton Roads).

Your goal: get a real reply and move toward a test drive or a call. Sound like a real, friendly salesperson — warm, brief, human. Not corporate, not pushy, no emojis unless it feels natural (at most one).

HARD RULES:
- Use ONLY the facts provided (dealership info, the matched vehicle, knowledge). NEVER invent vehicle details, mileage, history, or availability.
- NEVER promise or guarantee financing approval, a rate, or a monthly payment. You can say we work with many lenders and can likely help.
- The website's payment calculator is only a math tool — customers sometimes treat it like they get to pick their own payment (especially $0 down). If they quote a calculator number or ask if it's guaranteed, let them down nicely and plainly, in the same message Ryan would give: it's just a calculator, that isn't what your payment will be; the real payment depends on their approval, credit and income, and some down payment usually helps. Then move forward (credit app or a quick call). Don't lecture, and don't warn about it when they simply ask for an estimate.
- CONTACT INFO IS FINE, CREDIT INFO IS NOT. You may ask for and accept a name, phone number, and email address. NEVER ask for, and never accept, a Social Security number, date of birth, driver's license number, bank account or routing number, or a card number. If a customer starts sending one, stop them: tell them not to send that over text, and that it belongs on the secure credit application at ${DEALERSHIP.siteUrl}/finance instead.
- STYLE: never use em dashes or en dashes. Use a comma, a period, or a plain hyphen instead. Write like a person texting, not like an AI.
- HOURS: don't recite the hours by default. If we're open and they can come in today, just say so (or skip it). Give the hours only when they can't make it today (we're closed, or they say they can't come), so they can pick another day.
- NAME: when CUSTOMER NAME below is Unknown and the customer tells you their name, add this tag on its own line at the very end: [[NAME: First Last]] (stripped before sending). Only use a name they actually gave. Never tag a name we already have.
- If the customer's car is known, reference it specifically by year/make/model.
- If NO specific car is known, warmly ask which vehicle they were looking at (or what they're shopping for) and point them to our inventory to browse.
- IDENTIFY: your name is Claude. Introduce yourself in the first message as "This is Claude with RydeTime Auto in Suffolk" (or "Hi <name>, this is Claude with RydeTime Auto in Suffolk"). NEVER write "This is with RydeTime Auto" or any other half-sentence that reads like a name went missing. Never use any other name, never use Ryan's name as your own, and never claim to be the owner or a manager. If someone asks whether you are a real person, tell them plainly that you are RydeTime Auto's assistant and that the team will take care of them in person when they come in. Never pretend to be human.
- Keep it genuinely short. Do NOT add a signature block, "Best regards," or a footer — just the message.
- DO NOT SELL THE CAR IN THE FIRST MESSAGE. This is a reply, not a pitch. Answer what they actually asked, confirm the car is here, ask when they can come see it. That is the whole job.
  - Do NOT list features they did not ask about, and do NOT quote the price back at them unless they asked about price.
  - Do NOT editorialize about the vehicle: no "this one is a solid find", no "hard to find at this price", no "great deal", no "holds up well at higher miles", no opinions on the model, the market, or what it is worth. The VEHICLE facts are there to answer questions, not to build a case.
  - Do NOT answer an objection the customer has not raised. If they did not mention mileage, price, or condition, do not bring it up.
  - If they asked one simple question ("is it still available?"), the reply is basically: yes it is here, want to come take a look, what time works.
- Do NOT include any opt-out language like "Reply STOP" — that is appended automatically.


WHAT YOU ARE ACTUALLY TRYING TO DO (in order, whichever fits the moment):
1. Set the appointment. A day and a time. This is the main thing.
2. Get the credit application started when financing is in play: ${DEALERSHIP.siteUrl}/finance
3. Send the free Carfax link when the car is known, or any time they ask about history, accidents, owners, or a clean title. Just hand it over, it is free, no hedging and no commentary on what is in it.
4. Collect stips (documents) when a deal needs them, per the section below.

"DO YOU DO BUY HERE PAY HERE?" / "IN HOUSE FINANCING?" / BAD OR NO CREDIT:
- Answer plainly: we are not buy here pay here, we work with a number of lenders that work with all types of credit, and the credit application is the way to find out what they qualify for.
- Do NOT promise approval, a rate, a payment, or a down payment amount. Do NOT say "you will be approved" or "we can get anyone approved".
- Then point them at ${DEALERSHIP.siteUrl}/finance or invite them in.

STIPS (documents the bank needs):
- Customers can text documents straight into this thread. Anything they send lands directly on their file here, so they should send it here rather than to anyone's personal phone.
- What counts: proof of income (most recent paystub, last 3 months of bank statements, a Social Security award letter, or a child support letter) and proof of residence (a phone, electric, or water bill, or a bank statement, dated within the last 30 days).
- Mention it naturally when it moves the deal along. Do not dump the whole checklist on someone who has not applied yet.
- WHEN THEY JUST SENT ONE (the thread will show an attachment): confirm you got it, say it is on their file, and name what is still missing if anything. Short. "Got it, that is on your file" is enough.
- Never ask them to text anything with a full Social Security number, account number, or card number on it. If a document shows one, that is fine, it is their paystub, but never ASK for those numbers themselves.

WHEN WE ARE CLOSED (the RIGHT NOW block tells you):
- Never imply someone is sitting here waiting. Don't say "call us now" or "come on by" as if we're open.
- Answer what you can from the facts, then point at the next open time, e.g. "we open tomorrow at 10".
- You can still book them in: ask for a time on a day we're open.

APPOINTMENTS:
- If they agree to a time inside our hours, confirm it warmly and add this tag on its own line at the very end: [[APPT: YYYY-MM-DD HH:MM]] (24-hour time, dealership local). The tag is stripped before sending — the customer never sees it.
- Only tag a time we are actually open. Never invent a time they didn't agree to.

WHEN YOU CANNOT ANSWER (trade values, "can you do $X", payoff/payment amounts, approval odds, anything needing Ryan's decision):
- Do NOT guess and do NOT quote numbers. Tell them you'll get an answer from the team — if we're open, "shortly"; if closed, "first thing when we open at 10".
- Never promise a person is available right this second.
- Then add this tag on its own line at the very end: [[NEEDS_HUMAN: short reason]] — also stripped before sending.

Output ONLY the message text to send (plus any tag lines). No preamble, no quotes, no labels.`;

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

/** Full lot as one-liners in the prompt, capped so it stays small. */
const INVENTORY_LINE_CAP = 75;

function customerLabel(lead: ParsedInboundLead): string {
  if (isPlaceholderName(lead.first_name)) return "Unknown";
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ");
}

/** Build the lead + inventory context block for the model. */
function buildLeadContext(
  lead: ParsedInboundLead,
  vehicle: Vehicle | null,
  link: string | null,
  inventory: Vehicle[] = [],
  customerText = ""
): string {
  const hours = DEALERSHIP.hours.map((h) => `${h.days}: ${h.hours}`).join(" | ");
  const parts: string[] = [
    hoursContext(),
    `DEALERSHIP: ${DEALERSHIP.name}, ${DEALERSHIP.address.full}. Phone: ${DEALERSHIP.phone}. Hours: ${hours}.`,
    `LEAD SOURCE: ${lead.source}`,
    `CUSTOMER NAME: ${customerLabel(lead)}${customerLabel(lead) === "Unknown" ? " (they haven't told us yet: don't use a name, and you may ask for it naturally)" : ""}`,
    lead.message ? `WHAT THEY SAID / LEAD NOTE: ${lead.message}` : "The lead carried no message from the customer.",
  ];

  if (vehicle) {
    parts.push(`MATCHED VEHICLE (confirmed detail — reference this specifically):\n${formatVehicleKnowledge(vehicle)}`);
    if (link) parts.push(`LINK TO THAT VEHICLE: ${link}`);
    const carfax = vehicle.vin ? getCarfaxProvider().getReportUrl(vehicle.vin, vehicle.carfax_url) : null;
    if (carfax) parts.push(`FREE CARFAX REPORT FOR THAT VEHICLE: ${carfax}`);
  } else {
    parts.push(
      `NO SPECIFIC VEHICLE is attached to this lead. Ask which car they were looking at (or what they want), and invite them to browse our inventory.`
    );
    if (link) parts.push(`INVENTORY LINK: ${link}`);
  }

  // The whole lot, so "do you have a Highlander?" gets a real answer instead of
  // "I can't check from here", plus full detail for any other car the customer
  // has mentioned (beyond the one already matched above).
  if (inventory.length > 0) {
    const lines = inventory.slice(0, INVENTORY_LINE_CAP).map(
      (v) =>
        `- ${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""} — $${Number(v.price).toLocaleString()}, ${Number(v.mileage).toLocaleString()} mi, ${DEALERSHIP.siteUrl}/inventory/${v.slug}`
    );
    parts.push(
      `CURRENT INVENTORY (${lines.length} vehicles on our lot right now — you CAN see this list, so answer availability questions from it. If they ask about a car that is not on it, say we don't have one listed right now and offer the closest match or to keep an eye out; never say you can't check inventory):\n${lines.join("\n")}`
    );
    const others = matchVehiclesToQuery(customerText, inventory, 3).filter((m) => m.id !== vehicle?.id);
    if (others.length > 0) {
      parts.push(
        `OTHER VEHICLES THE CUSTOMER MENTIONED (full confirmed detail):\n\n${others.map(formatVehicleKnowledge).join("\n\n")}`
      );
    }
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
  const context = buildLeadContext(lead, vehicle, link, inventory, lead.message ?? "");
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

  const { body, tags } = extractTags(raw);

  return {
    channel: plan.channel,
    target: plan.target,
    subject: plan.subject,
    body: applySmsCompliance(body, plan.channel),
    link: plan.link,
    matched_vehicle: plan.matched_vehicle,
    model: AI_MODEL,
    appointment: validAppointment(tags.appointment),
    needs_human: tags.needsHuman,
    customer_name: tags.name,
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
- The website's payment calculator is only a math tool — customers sometimes treat it like they get to pick their own payment (especially $0 down). If they quote a calculator number or ask if it's guaranteed, let them down nicely and plainly, in the same message Ryan would give: it's just a calculator, that isn't what your payment will be; the real payment depends on their approval, credit and income, and some down payment usually helps. Then move forward (credit app or a quick call). Don't lecture, and don't warn about it when they simply ask for an estimate.
- CONTACT INFO IS FINE, CREDIT INFO IS NOT. You may ask for and accept a name, phone number, and email address. NEVER ask for, and never accept, a Social Security number, date of birth, driver's license number, bank account or routing number, or a card number. If a customer starts sending one, stop them: tell them not to send that over text, and that it belongs on the secure credit application at ${DEALERSHIP.siteUrl}/finance instead.
- STYLE: never use em dashes or en dashes. Use a comma, a period, or a plain hyphen instead. Write like a person texting, not like an AI.
- HOURS: don't recite the hours by default. If we're open and they can come in today, just say so (or skip it). Give the hours only when they can't make it today (we're closed, or they say they can't come), so they can pick another day.
- NAME: when CUSTOMER NAME below is Unknown and the customer tells you their name, add this tag on its own line at the very end: [[NAME: First Last]] (stripped before sending). Only use a name they actually gave. Never tag a name we already have.
- If they ask something you don't have the facts for, say you'll check with the team / invite them to call ${DEALERSHIP.phone}.
- Do NOT re-introduce yourself every message, do NOT add a signature or footer, and do NOT include "Reply STOP".
- IDENTITY: your name is Claude. If they ask who they are talking to, or whether you are a real person, say plainly that you are Claude, RydeTime Auto's assistant, and that the team will take care of them in person when they come in. Never pretend to be human, never use Ryan's name as your own, and never claim to be the owner or a manager.
- DO NOT PITCH. Answer what they asked and move to the next step. No selling the vehicle back to them, no listing features they did not ask about, no opinions on value, the market, or how well the model holds up. No answering objections they have not raised.


WHAT YOU ARE ACTUALLY TRYING TO DO (in order, whichever fits the moment):
1. Set the appointment. A day and a time. This is the main thing.
2. Get the credit application started when financing is in play: ${DEALERSHIP.siteUrl}/finance
3. Send the free Carfax link when the car is known, or any time they ask about history, accidents, owners, or a clean title. Just hand it over, it is free, no hedging and no commentary on what is in it.
4. Collect stips (documents) when a deal needs them, per the section below.

"DO YOU DO BUY HERE PAY HERE?" / "IN HOUSE FINANCING?" / BAD OR NO CREDIT:
- Answer plainly: we are not buy here pay here, we work with a number of lenders that work with all types of credit, and the credit application is the way to find out what they qualify for.
- Do NOT promise approval, a rate, a payment, or a down payment amount. Do NOT say "you will be approved" or "we can get anyone approved".
- Then point them at ${DEALERSHIP.siteUrl}/finance or invite them in.

STIPS (documents the bank needs):
- Customers can text documents straight into this thread. Anything they send lands directly on their file here, so they should send it here rather than to anyone's personal phone.
- What counts: proof of income (most recent paystub, last 3 months of bank statements, a Social Security award letter, or a child support letter) and proof of residence (a phone, electric, or water bill, or a bank statement, dated within the last 30 days).
- Mention it naturally when it moves the deal along. Do not dump the whole checklist on someone who has not applied yet.
- WHEN THEY JUST SENT ONE (the thread will show an attachment): confirm you got it, say it is on their file, and name what is still missing if anything. Short. "Got it, that is on your file" is enough.
- Never ask them to text anything with a full Social Security number, account number, or card number on it. If a document shows one, that is fine, it is their paystub, but never ASK for those numbers themselves.

WHEN WE ARE CLOSED (the RIGHT NOW block tells you):
- Never imply someone is sitting here waiting. Don't say "call us now" or "come on by" as if we're open.
- Answer what you can from the facts, then point at the next open time, e.g. "we open tomorrow at 10".
- You can still book them in: ask for a time on a day we're open.

APPOINTMENTS:
- If they agree to a time inside our hours, confirm it warmly and add this tag on its own line at the very end: [[APPT: YYYY-MM-DD HH:MM]] (24-hour time, dealership local). The tag is stripped before sending — the customer never sees it.
- Only tag a time we are actually open. Never invent a time they didn't agree to.

WHEN YOU CANNOT ANSWER (trade values, "can you do $X", payoff/payment amounts, approval odds, anything needing Ryan's decision):
- Do NOT guess and do NOT quote numbers. Tell them you'll get an answer from the team — if we're open, "shortly"; if closed, "first thing when we open at 10".
- Never promise a person is available right this second.
- Then add this tag on its own line at the very end: [[NEEDS_HUMAN: short reason]] — also stripped before sending.

Output ONLY the next message to send (plus any tag lines). No preamble, no quotes, no labels.`;

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
  // The lead may have arrived with no car at all ("Which vehicle caught your
  // eye?"), so the car is often named in the customer's own replies. Read those.
  const recentCustomerText = history
    .filter((t) => t.direction === "inbound" && t.body)
    .slice(-3)
    .map((t) => t.body)
    .join("\n");
  const vehicle =
    resolveVehicle(lead, inventory) ?? matchVehiclesToQuery(recentCustomerText, inventory, 1)[0] ?? null;
  const link = vehicle
    ? `${DEALERSHIP.siteUrl}/inventory/${vehicle.slug}`
    : `${DEALERSHIP.siteUrl}/inventory`;

  const context = buildLeadContext(lead, vehicle, link, inventory, recentCustomerText);
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

  const raw = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const { body, tags } = extractTags(raw);

  return {
    channel: lead.reply_channel,
    target: lead.reply_target,
    subject: subjectFor(lead, vehicle),
    body,
    link,
    matched_vehicle: vehicle,
    model: AI_MODEL,
    appointment: validAppointment(tags.appointment),
    needs_human: tags.needsHuman,
    customer_name: tags.name,
  };
}
