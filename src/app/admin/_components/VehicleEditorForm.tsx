"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Vehicle, PrepBadgeType, VehicleStatus } from "@/types/vehicle";

const BADGE_OPTIONS: { value: PrepBadgeType; label: string }[] = [
  { value: "state_inspection", label: "State Inspection" },
  { value: "oil_change", label: "Oil Change" },
  { value: "new_tires", label: "New Tires" },
  { value: "new_brakes", label: "New Brakes" },
  { value: "detailed", label: "Detailed" },
  { value: "multi_point_review", label: "Multi-Point Review" },
  { value: "battery_checked", label: "Battery Checked" },
  { value: "fluids_topped", label: "Fluids Topped" },
];

const STATUS_OPTIONS: VehicleStatus[] = [
  "active",
  "fresh_arrival",
  "hold_pending",
  "sold",
];

export default function VehicleEditorForm({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [form, setForm] = useState({
    description_ai: vehicle.description_ai ?? "",
    ryans_take: vehicle.ryans_take ?? "",
    best_fit_for: vehicle.best_fit_for ?? "",
    what_to_know: vehicle.what_to_know ?? "",
    featured: vehicle.featured,
    ryans_pick: vehicle.ryans_pick,
    status: vehicle.status,
    carfax_url: vehicle.carfax_url ?? "",
    carfax_badge_one_owner: vehicle.carfax_badge_one_owner ?? false,
    carfax_badge_accident_free: vehicle.carfax_badge_accident_free ?? false,
    carfax_badge_service_records: vehicle.carfax_badge_service_records ?? false,
    carfax_badge_great_value: vehicle.carfax_badge_great_value ?? false,
    carfax_badge_good_value: vehicle.carfax_badge_good_value ?? false,
    video_url: vehicle.video_url ?? "",
  });
  const [badges, setBadges] = useState<PrepBadgeType[]>(
    (vehicle.vehicle_prep_badges ?? []).map((b) => b.badge_type)
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function toggleBadge(badge: PrepBadgeType) {
    setBadges((prev) =>
      prev.includes(badge) ? prev.filter((b) => b !== badge) : [...prev, badge]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description_ai: form.description_ai || null,
          ryans_take: form.ryans_take || null,
          best_fit_for: form.best_fit_for || null,
          what_to_know: form.what_to_know || null,
          featured: form.featured,
          ryans_pick: form.ryans_pick,
          status: form.status,
          carfax_url: form.carfax_url || null,
          carfax_badge_one_owner: form.carfax_badge_one_owner,
          carfax_badge_accident_free: form.carfax_badge_accident_free,
          carfax_badge_service_records: form.carfax_badge_service_records,
          carfax_badge_great_value: form.carfax_badge_great_value,
          carfax_badge_good_value: form.carfax_badge_good_value,
          video_url: form.video_url || null,
          prep_badges: badges,
        }),
      });
      if (res.ok) {
        setMessage({ ok: true, text: "Saved. Changes are recorded as admin overrides." });
        router.refresh();
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

  async function handleGenerate() {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/vehicle-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicle.id }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setForm((prev) => ({
          ...prev,
          description_ai: data.description_ai ?? data.full_description ?? prev.description_ai,
          ryans_take: data.ryans_take ?? prev.ryans_take,
          best_fit_for: data.best_fit_for ?? prev.best_fit_for,
          what_to_know: data.what_to_know ?? prev.what_to_know,
        }));
        setMessage({ ok: true, text: "AI description generated — review and save." });
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage({ ok: false, text: body.error ?? "Generation failed." });
      }
    } catch {
      setMessage({ ok: false, text: "Generation failed — network error." });
    } finally {
      setGenerating(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent";
  const labelClass =
    "mb-1 block text-xs font-semibold uppercase tracking-widest text-text-muted";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
        >
          {generating ? "Generating…" : "✨ Generate AI Description"}
        </button>
        {message && (
          <p className={`text-sm ${message.ok ? "text-text-secondary" : "text-accent"}`}>
            {message.text}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description_ai" className={labelClass}>
          AI Description (shown on vehicle page)
        </label>
        <textarea
          id="description_ai"
          rows={8}
          value={form.description_ai}
          onChange={(e) => setForm({ ...form, description_ai: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="ryans_take" className={labelClass}>
            Ryan&apos;s Take
          </label>
          <textarea
            id="ryans_take"
            rows={3}
            value={form.ryans_take}
            onChange={(e) => setForm({ ...form, ryans_take: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="best_fit_for" className={labelClass}>
            Best Fit For
          </label>
          <textarea
            id="best_fit_for"
            rows={3}
            value={form.best_fit_for}
            onChange={(e) => setForm({ ...form, best_fit_for: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="what_to_know" className={labelClass}>
          What To Know (honest notes)
        </label>
        <textarea
          id="what_to_know"
          rows={3}
          value={form.what_to_know}
          onChange={(e) => setForm({ ...form, what_to_know: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as VehicleStatus })
            }
            className={inputClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="carfax_url" className={labelClass}>
            Carfax URL
          </label>
          <input
            id="carfax_url"
            type="url"
            value={form.carfax_url}
            onChange={(e) => setForm({ ...form, carfax_url: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="video_url" className={labelClass}>
            Video URL
          </label>
          <input
            id="video_url"
            type="url"
            value={form.video_url}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="h-4 w-4 accent-[#CC0000]"
          />
          Featured on homepage
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={form.ryans_pick}
            onChange={(e) => setForm({ ...form, ryans_pick: e.target.checked })}
            className="h-4 w-4 accent-[#CC0000]"
          />
          Ryan&apos;s Pick
        </label>
      </div>

      <div>
        <p className={labelClass}>Carfax Badges (shown on the listing + car page)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {([
            ["carfax_badge_one_owner", "1-Owner"],
            ["carfax_badge_great_value", "Great Value"],
            ["carfax_badge_good_value", "Good Value"],
            ["carfax_badge_accident_free", "No Accidents"],
            ["carfax_badge_service_records", "Service History"],
          ] as const).map(([key, label]) => (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                form[key]
                  ? "border-[#F47B20] bg-[#F47B20]/10 text-text-primary"
                  : "border-border-subtle bg-surface text-text-secondary"
              }`}
            >
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                className="h-3.5 w-3.5 accent-[#F47B20]"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-text-muted">
          The DealerCenter feed doesn&apos;t include Carfax badges — tick the ones each car
          earns and they&apos;ll show on the inventory grid. Preserved across syncs.
        </p>
      </div>

      <div>
        <p className={labelClass}>Prep Badges</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BADGE_OPTIONS.map((b) => (
            <label
              key={b.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                badges.includes(b.value)
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-border-subtle bg-surface text-text-secondary"
              }`}
            >
              <input
                type="checkbox"
                checked={badges.includes(b.value)}
                onChange={() => toggleBadge(b.value)}
                className="h-3.5 w-3.5 accent-[#CC0000]"
              />
              {b.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border-subtle pt-6">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <p className="text-xs text-text-muted">
          Saved fields are recorded as admin overrides and preserved across
          DealerCenter syncs.
        </p>
      </div>
    </form>
  );
}
