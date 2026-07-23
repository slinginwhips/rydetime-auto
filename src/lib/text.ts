/** Text helpers for cleaning up feed-sourced copy before it's shown. */

// The DealerCenter feed's ad description is the same canned dealer boilerplate
// on every car (store name/address, the $599 fee, financing legalese) and
// arrives with mojibake where special characters were flattened. It carries no
// per-car detail, so we don't want it standing in as a vehicle "description".
const BOILERPLATE_SIGNALS = [
  /processing fee/i,
  /dealer-inspected/i,
  /challenged credit/i,
  /internet prices are promotional/i,
  /in-house financing/i,
];

/** True when the text is the generic dealer boilerplate rather than real copy. */
export function isDealerBoilerplate(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return BOILERPLATE_SIGNALS.some((re) => re.test(raw));
}

/**
 * Best-effort cleanup of feed text: strip mojibake (`??` / replacement chars),
 * re-space sentences that got glued together, and collapse whitespace.
 */
export function cleanDealerText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/�/g, "") // Unicode replacement char
    .replace(/\?{2,}/g, " ") // runs of ?? left by flattened emoji/dashes
    .replace(/([.!?,])(?=[A-Z0-9])/g, "$1 ") // space after glued punctuation: "road.We" -> "road. We"
    .replace(/([a-z])(?=[A-Z])/g, "$1 ") // split glued camel joins: "SalesAll" -> "Sales All"
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Resolve the description to show for a vehicle: prefer the AI-written copy;
 * otherwise fall back to the dealer notes only if they're actually per-car
 * content (not the shared boilerplate), cleaned up.
 */
export function resolveVehicleDescription(
  ai: string | null | undefined,
  dc: string | null | undefined
): string {
  const aiCopy = (ai ?? "").trim();
  if (aiCopy) return aiCopy;
  if (!dc || isDealerBoilerplate(dc)) return "";
  return cleanDealerText(dc);
}
