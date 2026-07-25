import React from "react";

/**
 * Minimal, dependency-free markdown renderer for AI chat replies.
 * Handles bold, italic, inline code, links, bullet/numbered lists, and line
 * breaks. XSS-safe by construction — output is React nodes built from parsed
 * text, never dangerouslySetInnerHTML.
 */

const INLINE_RE =
  /(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*\n]+)\*)|(`([^`]+)`)/g;

function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[1]) {
      // [label](url)
      nodes.push(
        <a
          key={key}
          href={m[3]}
          target={m[3].startsWith("http") ? "_blank" : undefined}
          rel={m[3].startsWith("http") ? "noopener noreferrer" : undefined}
          className="font-medium text-accent underline underline-offset-2"
        >
          {m[2]}
        </a>
      );
    } else if (m[4] !== undefined) {
      nodes.push(<strong key={key}>{m[5]}</strong>);
    } else if (m[6] !== undefined) {
      nodes.push(<strong key={key}>{m[7]}</strong>);
    } else if (m[8] !== undefined) {
      nodes.push(<em key={key}>{m[9]}</em>);
    } else if (m[10] !== undefined) {
      nodes.push(
        <code key={key} className="rounded bg-background px-1 py-0.5 font-mono text-[0.85em]">
          {m[11]}
        </code>
      );
    }
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Models like to wrap a URL in backticks. Inline code is matched before links,
 * so `[Apply](/credit-application)` rendered as literal unclickable text — the
 * exact thing a customer needs to click. Unwrap it before parsing.
 */
function unwrapCodeLinks(text: string): string {
  return text.replace(/`(\[[^\]]+\]\([^)\s]+\))`/g, "$1");
}

function ChatMarkdown({ text }: { text: string }) {
  const lines = unwrapCodeLinks(text).split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → spacing handled by block margins.
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Unordered list.
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`b${key++}`} className="my-1 list-disc space-y-1 pl-5">
          {items.map((it, j) => (
            <li key={j}>{parseInline(it, `ul${key}-${j}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`b${key++}`} className="my-1 list-decimal space-y-1 pl-5">
          {items.map((it, j) => (
            <li key={j}>{parseInline(it, `ol${key}-${j}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph — gather consecutive non-blank, non-list lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      // Strip heading markers; render as a regular paragraph line.
      para.push(lines[i].replace(/^#{1,6}\s+/, ""));
      i++;
    }
    blocks.push(
      <p key={`b${key++}`} className="my-1 first:mt-0 last:mb-0">
        {para.map((l, j) => (
          <React.Fragment key={j}>
            {parseInline(l, `p${key}-${j}`)}
            {j < para.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <>{blocks}</>;
}

export default ChatMarkdown;
