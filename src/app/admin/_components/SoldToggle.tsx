"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VehicleStatus } from "@/types/vehicle";

interface SoldToggleProps {
  vehicleId: string;
  status: VehicleStatus;
  label: string;
}

/**
 * One-tap "take it off the website" / "put it back".
 *
 * The website's inventory comes from DealerCenter's FTP drop, which is a single
 * file dated once a day — so marking a car sold in DealerCenter (or the DMS)
 * can't reach the site until the next morning's sync. This is the manual
 * override for the hours in between. It writes an admin_override, so the next
 * sync re-applies it instead of putting the car back on the lot.
 */
export default function SoldToggle({ vehicleId, status, label }: SoldToggleProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const isSold = status === "sold";

  async function toggle() {
    if (isSold && !confirm(`Put the ${label} back on the website?`)) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isSold ? "active" : "sold" }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`whitespace-nowrap rounded border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
        isSold
          ? "border-border-subtle text-text-secondary hover:border-accent hover:text-text-primary"
          : "border-border-subtle text-text-primary hover:border-accent hover:text-accent"
      }`}
      title={
        isSold
          ? "Show this vehicle on the website again"
          : "Remove this vehicle from the website right now, without waiting for the DealerCenter sync"
      }
    >
      {busy ? "Saving…" : failed ? "Failed — retry" : isSold ? "Put back on site" : "Mark sold"}
    </button>
  );
}
