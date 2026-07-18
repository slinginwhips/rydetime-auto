"use client";

import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/Logo";
import { estimateMonthlyPayment, type VehicleCard as VehicleCardType } from "@/types/vehicle";

interface VehicleCardProps {
  vehicle: VehicleCardType;
}

export function openChatForVehicle(vehicleId?: string) {
  window.dispatchEvent(
    new CustomEvent("rydetime:open-chat", { detail: { vehicleId } })
  );
}

/** Carfax fox-orange check mark used inside the trust badges. */
function CarfaxCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#F47B20" />
      <path
        d="M7 12.5 L10.5 16 L17 8.5"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function VehicleCard({ vehicle: v }: VehicleCardProps) {
  const title = [v.year, v.make, v.model].join(" ");
  const monthly = estimateMonthlyPayment(v.price);
  const isFresh = v.days_in_inventory <= 7;

  return (
    <article className="card-hover group flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-background-card">
      {/* Photo */}
      <Link
        href={`/inventory/${v.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-background-secondary"
        aria-label={`View details for ${title}`}
      >
        {v.primary_photo_url ? (
          <Image
            src={v.primary_photo_url}
            alt={`${title}${v.trim ? ` ${v.trim}` : ""}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="card-photo object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-background-secondary">
            <Logo variant="dark" className="h-12 w-auto opacity-30" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {isFresh && v.status !== "hold_pending" && (
            <span className="rounded bg-accent px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Fresh Arrival
            </span>
          )}
          {v.status === "hold_pending" && (
            <span className="rounded bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-primary ring-1 ring-border-subtle">
              Hold Pending
            </span>
          )}
          {v.price_reduced && (
            <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
              Price Reduced
            </span>
          )}
          {v.ryans_pick && (
            <span className="rounded border border-accent bg-background/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-primary">
              Ryan&apos;s Pick
            </span>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold text-text-primary">
          {title}
          {v.trim && <span className="text-text-secondary"> {v.trim}</span>}
        </h3>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="tabular text-2xl font-bold text-text-primary">
            ${v.price.toLocaleString()}
            {v.price_reduced && v.original_price && v.original_price > v.price && (
              <span className="tabular ml-2 text-sm font-normal text-text-muted line-through">
                ${v.original_price.toLocaleString()}
              </span>
            )}
          </p>
          <p className="tabular text-sm text-text-secondary">
            {v.mileage.toLocaleString()} mi
          </p>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="tabular text-sm text-text-secondary">
            Est. ${monthly.toLocaleString()}/mo
          </p>
          <p className="text-xs text-text-muted">Stock #{v.stock_number}</p>
        </div>

        {/* Carfax: trust badges (the ones this car qualifies for) + report button */}
        <div className="mt-3 space-y-2">
          {(v.carfax_badge_great_value || v.carfax_badge_one_owner) && (
            <div className="flex flex-wrap gap-1.5">
              {v.carfax_badge_great_value && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#F47B20]/40 bg-[#F47B20]/10 px-2 py-0.5 text-[11px] font-semibold text-[#F9A05B]">
                  <CarfaxCheck /> Great Value
                </span>
              )}
              {v.carfax_badge_one_owner && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                  <CarfaxCheck /> 1-Owner
                </span>
              )}
            </div>
          )}
          <a
            href={v.carfax_report_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Show me the Carfax for ${title} (opens in a new tab)`}
            className="inline-block overflow-hidden rounded-md shadow-sm shadow-black/25 ring-1 ring-black/10 transition-transform duration-200 hover:-translate-y-0.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/showmethecarfax.jpg"
              alt="Show me the Carfax"
              width={156}
              height={56}
              className="block h-8 w-auto"
              loading="lazy"
            />
          </a>
        </div>

        {/* CTAs */}
        <div className="mt-4 flex gap-2 pt-2">
          <Link
            href={`/inventory/${v.slug}`}
            className="flex-1 rounded-md bg-accent px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            View Details
          </Link>
          <button
            type="button"
            onClick={() => openChatForVehicle(v.id)}
            className="flex-1 rounded-md border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent"
          >
            Ask AI
          </button>
        </div>
      </div>
    </article>
  );
}
