/**
 * Names we file a lead under when the customer hasn't told us theirs yet.
 * They read as "Unknown" to a human and get replaced the moment a real name
 * shows up (the customer tells the BDC, or the DMS pulls a fresher copy).
 */
const PLACEHOLDERS = new Set(["", "unknown", "text-in", "marketplace lead", "chat visitor", "there"]);

export function isPlaceholderName(name: string | null | undefined): boolean {
  return PLACEHOLDERS.has((name ?? "").trim().toLowerCase());
}

/** Keep a model-supplied name to something that plausibly is one. */
export function cleanPersonName(raw: string | null | undefined): { first: string; last: string | null } | null {
  const chunks = (raw ?? "")
    .replace(/[^A-Za-z'\- ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  if (chunks.length === 0 || chunks[0].length < 2 || isPlaceholderName(chunks[0])) return null;
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  return { first: cap(chunks[0]), last: chunks.length > 1 ? chunks.slice(1).map(cap).join(" ") : null };
}
