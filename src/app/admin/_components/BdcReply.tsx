"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Manual reply box for a lead's BDC thread. Sends a real message now (via the
 * customer's channel) — this is a human taking over the conversation, so it
 * bypasses the auto-send switch server-side.
 */
export default function BdcReply({
  leadId,
  channel,
  disabled,
  disabledReason,
}: {
  leadId: string;
  channel: string | null;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (disabled) {
    return (
      <p className="mt-3 rounded-md bg-surface p-3 text-xs text-text-muted">
        {disabledReason ?? "Replies are disabled for this lead."}
      </p>
    );
  }

  async function send() {
    if (!body.trim() || sending) return;
    setSending(true);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/bdc/${leadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; skipped?: string; error?: string };
      if (!res.ok) {
        setNote(data.error ?? "Failed to send.");
      } else if (data.ok) {
        setBody("");
        setNote("Sent ✓");
        router.refresh();
      } else {
        // Logged to the thread but not delivered (e.g. Twilio not configured yet).
        setBody("");
        setNote(`Saved to thread, not delivered (${data.skipped ?? "unknown"}).`);
        router.refresh();
      }
    } catch {
      setNote("Network error — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4">
      <label className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        Reply {channel ? `(${channel})` : ""}
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Type a message to the customer…"
        className="mt-1 w-full rounded-md border border-border-subtle bg-surface p-3 text-sm text-text-primary focus:border-accent focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11px] text-text-muted">{note}</span>
        <button
          type="button"
          onClick={send}
          disabled={sending || !body.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
