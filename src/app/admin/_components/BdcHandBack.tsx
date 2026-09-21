"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Hand back to BDC" — shown once a human has taken over a thread (or the BDC
 * asked for help). Until this is clicked, the bot stays quiet on this lead.
 */
export default function BdcHandBack({ leadId, paused }: { leadId: string; paused: boolean }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function resume() {
    if (working) return;
    setWorking(true);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/bdc/${leadId}/resume`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setNote(data.error ?? "Couldn't hand it back.");
      } else {
        router.refresh();
      }
    } catch {
      setNote("Network error — try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="text-[11px] text-text-muted">
        {paused
          ? "The BDC is paused on this lead — you're handling it."
          : "The BDC is answering this lead automatically."}
      </span>
      {paused && (
        <button
          type="button"
          onClick={resume}
          disabled={working}
          className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-50"
        >
          {working ? "…" : "Hand back to BDC"}
        </button>
      )}
      {note && <span className="text-[11px] text-red-400">{note}</span>}
    </div>
  );
}
