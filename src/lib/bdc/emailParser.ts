/**
 * Minimal, dependency-free email (.eml / raw MIME) parser, scoped to what the
 * BDC lead extractors need: a handful of headers and the decoded text/plain
 * body (with an HTML fallback). It is deliberately NOT a general MIME library —
 * it handles the encodings the lead marketplaces actually use (quoted-printable,
 * base64, single-part and multipart/alternative) and nothing more.
 */

export interface ParsedEmail {
  /** Lower-cased header name -> unfolded value (last wins on duplicates). */
  headers: Record<string, string>;
  from: string | null;
  fromName: string | null;
  replyTo: string | null;
  to: string | null;
  returnPath: string | null;
  subject: string | null;
  date: string | null;
  /** Decoded text/plain body, best effort (falls back to stripped HTML). */
  text: string;
  /** Raw decoded text/html body, when present. */
  html: string | null;
}

/** Decode quoted-printable to a UTF-8 string (handles multi-byte sequences). */
export function decodeQuotedPrintable(input: string): string {
  const noSoftBreaks = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < noSoftBreaks.length; i++) {
    const ch = noSoftBreaks[i];
    if (ch === "=" && i + 2 < noSoftBreaks.length) {
      const hex = noSoftBreaks.substr(i + 1, 2);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    const code = ch.charCodeAt(0);
    if (code < 128) {
      bytes.push(code);
    } else {
      for (const b of Buffer.from(ch, "utf8")) bytes.push(b);
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

/** Decode RFC 2047 encoded-words (=?charset?B/Q?...?=) found in headers. */
function decodeEncodedWords(value: string): string {
  return value.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_m, _charset, enc, data) => {
      try {
        if (enc.toUpperCase() === "B") {
          return Buffer.from(data, "base64").toString("utf8");
        }
        // Q-encoding: like QP but "_" means space.
        return decodeQuotedPrintable(String(data).replace(/_/g, " "));
      } catch {
        return _m;
      }
    }
  );
}

/** Split a raw message into its header block and body at the first blank line. */
function splitHeadersAndBody(raw: string): { headerBlock: string; body: string } {
  const normalized = raw.replace(/\r\n/g, "\n");
  const idx = normalized.indexOf("\n\n");
  if (idx === -1) return { headerBlock: normalized, body: "" };
  return {
    headerBlock: normalized.slice(0, idx),
    body: normalized.slice(idx + 2),
  };
}

/** Parse a header block into a map, unfolding continuation (folded) lines. */
function parseHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerBlock.split("\n");
  const unfolded: string[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += " " + line.trim();
    } else {
      unfolded.push(line);
    }
  }
  for (const line of unfolded) {
    const m = line.match(/^([!-9;-~]+):\s?(.*)$/);
    if (!m) continue;
    headers[m[1].toLowerCase()] = decodeEncodedWords(m[2]);
  }
  return headers;
}

function getBoundary(contentType: string): string | null {
  const m = contentType.match(/boundary="?([^";]+)"?/i);
  return m ? m[1] : null;
}

/** Decode a body chunk according to its Content-Transfer-Encoding. */
function decodeBody(body: string, cte: string): string {
  const enc = cte.toLowerCase();
  if (enc.includes("base64")) {
    try {
      return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
    } catch {
      return body;
    }
  }
  if (enc.includes("quoted-printable")) return decodeQuotedPrintable(body);
  return body;
}

/** Very light HTML -> text, used only as a fallback when there's no text part. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#x?[0-9a-f]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

interface MimePart {
  contentType: string;
  content: string; // decoded
}

/** Recursively collect the text/plain and text/html parts of a message. */
function collectParts(headers: Record<string, string>, body: string): MimePart[] {
  const rawContentType = headers["content-type"] || "";
  const contentType = rawContentType.toLowerCase();
  const cte = headers["content-transfer-encoding"] || "";

  if (contentType.startsWith("multipart/")) {
    // NB: read the boundary from the ORIGINAL-case header — boundaries are
    // case-sensitive and often contain uppercase (e.g. CAPS emails).
    const boundary = getBoundary(rawContentType);
    if (!boundary) return [];
    const segments = body.split(`--${boundary}`);
    const parts: MimePart[] = [];
    for (const seg of segments) {
      const trimmed = seg.replace(/^\n/, "");
      if (trimmed === "" || trimmed.startsWith("--")) continue; // preamble / closing
      const { headerBlock, body: partBody } = splitHeadersAndBody(trimmed);
      const partHeaders = parseHeaders(headerBlock);
      parts.push(...collectParts(partHeaders, partBody));
    }
    return parts;
  }

  // Leaf part.
  return [{ contentType, content: decodeBody(body, cte) }];
}

export function parseEmail(raw: string): ParsedEmail {
  const { headerBlock, body } = splitHeadersAndBody(raw);
  const headers = parseHeaders(headerBlock);

  const parts = collectParts(headers, body);
  const plain = parts.find((p) => p.contentType.includes("text/plain"));
  const html = parts.find((p) => p.contentType.includes("text/html"));

  const text = plain
    ? plain.content
    : html
      ? htmlToText(html.content)
      : "";

  const fromRaw = headers["from"] || null;
  let from: string | null = null;
  let fromName: string | null = null;
  if (fromRaw) {
    const angle = fromRaw.match(/<([^>]+)>/);
    from = angle ? angle[1].trim() : fromRaw.trim();
    const name = fromRaw.replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "");
    fromName = name || null;
  }

  const replyToRaw = headers["reply-to"] || null;
  const replyTo = replyToRaw
    ? (replyToRaw.match(/<([^>]+)>/)?.[1] || replyToRaw).trim()
    : null;

  return {
    headers,
    from,
    fromName,
    replyTo,
    to: headers["to"] || null,
    returnPath: headers["return-path"] || null,
    subject: headers["subject"] || null,
    date: headers["date"] || null,
    text,
    html: html ? html.content : null,
  };
}
