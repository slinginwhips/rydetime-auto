"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SyncResult {
  added?: number;
  updated?: number;
  sold?: number;
  unchanged?: number;
  errors?: string[];
  error?: string;
}

export default function RunSyncButton() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [failed, setFailed] = useState(false);

  async function runSync() {
    setRunning(true);
    setResult(null);
    setFailed(false);
    try {
      const headers: Record<string, string> = {};
      // Admin cookie auth works by default; a pasted secret adds Bearer auth.
      if (secret.trim()) headers.Authorization = `Bearer ${secret.trim()}`;
      const res = await fetch("/api/inventory/sync", {
        method: "POST",
        headers,
      });
      const data = (await res.json().catch(() => ({}))) as SyncResult;
      setResult(data);
      setFailed(!res.ok);
      router.refresh();
    } catch {
      setFailed(true);
      setResult({ error: "Network error — sync request failed." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-background-card p-5">
      <h2 className="text-sm font-bold text-text-primary">Manual Sync</h2>
      <p className="mt-1 text-xs text-text-secondary">
        Pulls the latest inventory from DealerCenter. Your admin session
        authorizes the request automatically — or paste the admin secret to
        send it as a Bearer token instead.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          placeholder="Admin secret (optional)"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent sm:max-w-xs"
        />
        <button
          type="button"
          onClick={runSync}
          disabled={running}
          className="shrink-0 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {running ? "Syncing…" : "Run Sync Now"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-md border p-3 text-xs ${
            failed
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border-subtle bg-surface text-text-secondary"
          }`}
        >
          {failed ? (
            <p>{result.error ?? "Sync failed — check the log below."}</p>
          ) : (
            <p className="tabular">
              Sync complete — added {result.added ?? 0}, updated{" "}
              {result.updated ?? 0}, sold {result.sold ?? 0}, unchanged{" "}
              {result.unchanged ?? 0}
              {result.errors && result.errors.length > 0 && (
                <span className="block text-accent">
                  {result.errors.length} error(s): {result.errors.join("; ")}
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
