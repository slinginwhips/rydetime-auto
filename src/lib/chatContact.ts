/**
 * Pulling a customer's name, phone and email out of a chat conversation.
 *
 * Kept pure and separate from the route so it can be exercised directly —
 * `npx tsx scripts/check-chat-contact.ts`. The route used to read only the
 * single most recent message, which is why a chat that opened with "I'd like
 * to get pre-approved" filed a nameless lead and then dropped the message
 * carrying the actual contact details.
 */

export const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/**
 * Words that follow "I'm" / "my name is" often enough to poison a name.
 * Better to file a lead as "Chat Visitor" than to call somebody "Interested In".
 */
const NOT_A_NAME =
  /^(interested|looking|trying|wondering|hoping|just|still|not|here|ready|good|fine|ok|okay|sure|thanks|yes|no|a|an|the|in|at|on|for|about|calling|asking|new|able|available|free|curious|hi|hello|hey|my|name|is|and|number|phone|email|cell|me|call|text|with|or|but|please|from|want|need|would|like|i|i'm|i’m|im|ive|i've|we|us|you|this|that|it|it's)$/i;

const NAME_LEAD_RE =
  /(?:my name is|my name's|name\s*[:\-]|this is|i am|i'm|im)\s+([A-Za-z][A-Za-z'’.\-]*(?:\s+[A-Za-z][A-Za-z'’.\-]*){0,2})/i;

export function cleanName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  // Stop at the first non-name word rather than filtering it out: "Dawn Reed
  // and my number is…" ends at "and", it doesn't become "Dawn Reed Number".
  const words: string[] = [];
  for (const word of raw.trim().split(/\s+/)) {
    if (word.length === 0) continue;
    if (NOT_A_NAME.test(word.replace(/[.,;:]+$/, ""))) break;
    words.push(word.replace(/[.,;:]+$/, ""));
  }
  if (words.length === 0 || words.length > 3) return null;
  return words
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 80);
}

/**
 * Best-effort name from what the customer typed. Two shapes cover almost
 * everything people actually send:
 *   "my name is Mee Maw"            → the phrase
 *   "Mee Maw 757-555-1234 x@y.com"  → the words before the first number/email
 * Anything less certain stays null and the lead keeps its placeholder.
 */
export function extractName(userMessages: string[]): string | null {
  for (const text of userMessages) {
    const phrase = cleanName(text.match(NAME_LEAD_RE)?.[1]);
    if (phrase) return phrase;
  }
  for (const text of userMessages) {
    if (!PHONE_RE.test(text) && !EMAIL_RE.test(text)) continue;
    const head = text.split(/[\d(]|[a-zA-Z0-9._%+-]+@/)[0];
    const guess = cleanName(head.replace(/[,;:|]+\s*$/, ""));
    if (guess) return guess;
  }
  return null;
}

export interface ChatContact {
  phone: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

/** Contact details from the WHOLE conversation — they rarely arrive at once. */
export function extractContact(messages: { role: string; content: string }[]): ChatContact {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  const joined = userMessages.join("\n");
  const name = extractName(userMessages);
  const [firstName, ...rest] = (name ?? "").split(" ");
  return {
    phone: joined.match(PHONE_RE)?.[0] ?? null,
    email: joined.match(EMAIL_RE)?.[0] ?? null,
    firstName: name ? firstName : null,
    lastName: rest.length > 0 ? rest.join(" ") : null,
  };
}
