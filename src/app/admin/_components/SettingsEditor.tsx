"use client";

import { useEffect, useState } from "react";

interface SettingRow {
  key: string;
  value: string;
}

/** Default keys offered when the table is empty so admins know what exists. */
const DEFAULT_KEYS: SettingRow[] = [
  { key: "business_hours", value: "Mon-Fri 10AM-6PM, Sat 10AM-5PM, Sun Closed" },
  { key: "contact_phone", value: "(757) 937-8664" },
  { key: "contact_email", value: "dawn@rydetimeauto.com" },
  { key: "ai_chat_enabled", value: "true" },
  { key: "ai_greeting", value: "Hi! I'm the RydeTime Auto assistant. How can I help you find your next vehicle?" },
];

export default function SettingsEditor() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        setConfigured(data.configured !== false);
        const existing: SettingRow[] = (data.settings ?? []).map(
          (s: { key: string; value: string | null }) => ({
            key: s.key,
            value: s.value ?? "",
          })
        );
        // Offer the standard keys that don't exist yet.
        const merged = [...existing];
        for (const def of DEFAULT_KEYS) {
          if (!merged.some((r) => r.key === def.key)) merged.push(def);
        }
        setRows(merged);
      })
      .catch(() => setMessage({ ok: false, text: "Failed to load settings." }))
      .finally(() => setLoading(false));
  }, []);

  function updateRow(i: number, patch: Partial<SettingRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const settings = rows.filter((r) => r.key.trim());
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setMessage({ ok: true, text: "Settings saved." });
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage({ ok: false, text: body.error ?? "Save failed." });
      }
    } catch {
      setMessage({ ok: false, text: "Save failed — network error." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Loading settings…</p>;
  }

  return (
    <div className="space-y-4">
      {!configured && (
        <div className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-xs text-text-secondary">
          Supabase is not configured — settings cannot be saved until database
          keys are added to the environment.
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="setting_key"
              value={row.key}
              onChange={(e) => updateRow(i, { key: e.target.value })}
              className="rounded-md border border-border-subtle bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent sm:w-56"
            />
            <textarea
              rows={1}
              placeholder="value"
              value={row.value}
              onChange={(e) => updateRow(i, { value: e.target.value })}
              className="flex-1 rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              aria-label={`Remove ${row.key || "setting"}`}
              className="shrink-0 rounded-md border border-border-subtle px-3 py-2 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md border border-border-subtle bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          + Add Setting
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !configured}
          className="rounded-md bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save All"}
        </button>
        {message && (
          <p className={`text-sm ${message.ok ? "text-text-secondary" : "text-accent"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
