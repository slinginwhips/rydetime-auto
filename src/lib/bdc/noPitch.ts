/**
 * Hard guard against the BDC talking a car up (or down). The prompts already
 * forbid it, but the model still slips ("solid, practical SUV", "great timing,
 * it just landed today", quoting the price nobody asked about), so every draft
 * is checked in code before it can be sent.
 *
 * Flow: detect → one rewrite with the offending bits named → if it still
 * fails, the draft is held and a human is alerted instead of sending it.
 */

const OPINION_PATTERNS: [RegExp, string][] = [
  [/\b(solid|great|good|nice|clean|sharp|sweet|awesome|amazing|beautiful|gorgeous|perfect|excellent|fantastic|reliable|dependable|practical|sporty|roomy|spacious|smooth|loaded)\b[^.!?\n]{0,40}\b(suv|truck|car|ride|vehicle|one|pick|choice|option|find|deal|sedan|van|jeep|machine|buy)\b/i, "an opinion about the vehicle"],
  [/\b(great|good|steal of a|killer|unbeatable|amazing) (deal|price|value|buy)\b/i, "calling it a deal"],
  [/\b(hard to find|won'?t last|going fast|move fast|moving fast|selling fast|popular|in demand|priced to sell|priced right|before it'?s gone)\b/i, "urgency / scarcity talk"],
  [/\b(great|perfect|good) timing\b/i, "urgency / scarcity talk"],
  [/\b(just (landed|arrived|came in|hit the lot|got (it|this one) in)|fresh (on|off)|brand new to (our|the) lot|landed on our lot)\b/i, "claims about when the car arrived"],
  [/\b(easy to live with|holds (up|its value)|runs (great|good|strong)|drives (great|like)|low miles for|high miles|lots of life left|well (kept|maintained|taken care of))\b/i, "claims about how the car drives or holds up"],
  [/\b(needs? (some )?work|rough|beat up|as[- ]is special|not perfect|has some (wear|issues|dings))\b/i, "talking the car down"],
  // "Just know it's a Honda, not as good as a Toyota but pretty close."
  [/\b(not as (good|reliable|nice)|better than|worse than|as good as|on par with|pretty close to|compared to|beats (a|the|any)|just know it'?s an?)\b/i, "comparing the car or brand to others"],
  [/\b(old|older|newer|aging|dated)\b[^.!?\n]{0,25}\b(suv|truck|car|sedan|van|jeep|pilot|model|one)\b/i, "an opinion about the car's age"],
  [/\b(hella|lots of|a lot of|tons of|plenty of|high|low|big|crazy|ton of) (miles|mileage)\b/i, "commenting on the mileage"],
  [/\b(you('| wi)ll love|you('| sh)ould be (just )?fine|can'?t go wrong|worth (it|every)|you won'?t regret|great (pick|choice|option))\b/i, "an opinion about the vehicle"],
];

const PRICE_ASKED = /\$|\bprice|\bcost|how much|\botd\b|out the door|\bpayment|\bdown\b|\bfinanc|\bafford|\bbudget/i;
const PRICE_IN_DRAFT = /\$\s?\d/;

/**
 * Sales-talk problems in a draft. `customerText` is what the customer has said
 * (lead message + replies) so a price they asked about can be answered.
 * `allowPrice` for staff-relayed answers that are supposed to carry numbers.
 */
export function salesTalkIssues(body: string, customerText: string, allowPrice = false): string[] {
  const issues = new Set<string>();
  for (const [re, label] of OPINION_PATTERNS) if (re.test(body)) issues.add(label);
  if (!allowPrice && PRICE_IN_DRAFT.test(body) && !PRICE_ASKED.test(customerText)) {
    issues.add("quoting the price when they did not ask about price");
  }
  return [...issues];
}

export function rewriteInstruction(issues: string[]): string {
  return `Your draft broke the no-pitch rule. It contained: ${issues.join("; ")}.
Rewrite it with ALL of that removed. No opinions about the car, no deal talk, no urgency, no claims about when it arrived or how it drives, no price unless they asked. Just answer what they asked, confirm the car is here if a car is known, and ask when they can come see it. Keep any tag lines exactly as they were. Output only the rewritten message.`;
}

export const HELD_REASON = "Auto-reply held: the draft kept pitching the car, so it was not sent. Please answer this customer yourself.";
