"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import VehicleCard from "@/components/VehicleCard";
import Reveal from "@/components/Reveal";
import type { VehicleCard as VehicleCardType } from "@/types/vehicle";

interface InventoryClientProps {
  vehicles: VehicleCardType[];
  makesAndModels: { make: string; models: string[] }[];
  pageSize: number;
  page: number;
  hasMore: boolean;
}

const BODY_STYLES = ["Sedan", "SUV", "Truck", "Van", "Coupe", "Hatchback", "Wagon", "Convertible"];
const FUEL_TYPES = ["Gasoline", "Diesel", "Hybrid", "Electric"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const DRIVETRAINS = ["FWD", "RWD", "AWD", "4WD"];

const QUICK_FILTERS: { label: string; params: Record<string, string> }[] = [
  { label: "Fresh Arrivals", params: { fresh: "1" } },
  { label: "Under $15k", params: { priceMax: "15000" } },
  { label: "Under $20k", params: { priceMax: "20000" } },
  { label: "First-Time Buyer", params: { priceMax: "15000", mileageMax: "120000" } },
  { label: "Commuter Cars", params: { body: "Sedan,Hatchback" } },
  { label: "Family Vehicles", params: { body: "SUV,Van" } },
  { label: "SUVs", params: { body: "SUV" } },
  { label: "Trucks", params: { body: "Truck" } },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest arrivals" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "mileage_asc", label: "Mileage: low to high" },
  { value: "year_desc", label: "Year: newest" },
  { value: "price_reduced", label: "Price reduced" },
];

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary transition-colors duration-200 focus:border-accent focus:outline-none";

export default function InventoryClient({
  vehicles,
  makesAndModels,
  pageSize,
  page,
  hasMore,
}: InventoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Increments on every filter/sort change so card Reveals re-key and re-stagger
  const [filterEpoch, setFilterEpoch] = useState(0);

  const get = (key: string) => searchParams.get(key) ?? "";

  const setParams = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) {
      next.delete("page");
      setFilterEpoch((e) => e + 1);
    }
    startTransition(() => {
      router.replace(`/inventory${next.toString() ? `?${next}` : ""}`, { scroll: false });
    });
  };

  const clearAll = () => {
    setFilterEpoch((e) => e + 1);
    startTransition(() => router.replace("/inventory", { scroll: false }));
  };

  const activeQuickFilter = (params: Record<string, string>) =>
    Object.entries(params).every(([k, v]) => get(k) === v);

  const toggleQuickFilter = (params: Record<string, string>) => {
    if (activeQuickFilter(params)) {
      setParams(Object.fromEntries(Object.keys(params).map((k) => [k, null])));
    } else {
      setParams(params);
    }
  };

  const selectedBodies = get("body") ? get("body").split(",") : [];
  const toggleBody = (style: string) => {
    const next = selectedBodies.includes(style)
      ? selectedBodies.filter((s) => s !== style)
      : [...selectedBodies, style];
    setParams({ body: next.length ? next.join(",") : null });
  };

  const selectedMake = get("make");
  const models = makesAndModels.find((m) => m.make.toLowerCase() === selectedMake.toLowerCase())?.models ?? [];

  // Monthly payment slider → price ceiling at 72mo / 8.9% APR
  const monthlyMax = get("monthlyMax") ? Number(get("monthlyMax")) : 0;
  const monthlyToPrice = (monthly: number) => {
    // Invert the amortization formula for principal
    const r = 8.9 / 100 / 12;
    const n = 72;
    return Math.round((monthly * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n)));
  };

  const hasFilters = ["priceMin", "priceMax", "monthlyMax", "yearMin", "yearMax", "make", "model", "mileageMax", "body", "fuel", "trans", "drive", "fresh", "reduced"].some((k) => get(k));

  const filters = (
    <div className="space-y-6">
      {/* Price */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">Price</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min $"
            aria-label="Minimum price"
            className={inputClass}
            defaultValue={get("priceMin")}
            onBlur={(e) => setParams({ priceMin: e.target.value || null })}
          />
          <input
            type="number"
            placeholder="Max $"
            aria-label="Maximum price"
            className={inputClass}
            defaultValue={get("priceMax")}
            onBlur={(e) => setParams({ priceMax: e.target.value || null })}
          />
        </div>
      </div>

      {/* Monthly payment */}
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
            Est. Monthly Payment
          </h3>
          <span className="tabular text-sm font-semibold text-text-primary">
            {monthlyMax ? `≤ $${monthlyMax}/mo` : "Any"}
          </span>
        </div>
        <input
          type="range"
          min={100}
          max={800}
          step={25}
          aria-label="Maximum estimated monthly payment"
          value={monthlyMax || 800}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 800) setParams({ monthlyMax: null, priceMax: get("priceMax") || null });
            else setParams({ monthlyMax: String(v), priceMax: String(monthlyToPrice(v)) });
          }}
          className="mt-3 w-full"
        />
        <p className="mt-1 text-[11px] text-text-muted">Assumes 72 mo / 8.9% APR / $0 down.</p>
      </div>

      {/* Year */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">Year</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input type="number" placeholder="From" aria-label="Minimum year" className={inputClass}
            defaultValue={get("yearMin")} onBlur={(e) => setParams({ yearMin: e.target.value || null })} />
          <input type="number" placeholder="To" aria-label="Maximum year" className={inputClass}
            defaultValue={get("yearMax")} onBlur={(e) => setParams({ yearMax: e.target.value || null })} />
        </div>
      </div>

      {/* Make / model */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">Make & Model</h3>
        <select
          aria-label="Make"
          className={`${inputClass} mt-3`}
          value={selectedMake}
          onChange={(e) => setParams({ make: e.target.value || null, model: null })}
        >
          <option value="">All makes</option>
          {makesAndModels.map((m) => (
            <option key={m.make} value={m.make}>{m.make}</option>
          ))}
        </select>
        <select
          aria-label="Model"
          className={`${inputClass} mt-2`}
          value={get("model")}
          disabled={!selectedMake}
          onChange={(e) => setParams({ model: e.target.value || null })}
        >
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Mileage */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">Max Mileage</h3>
        <select
          aria-label="Maximum mileage"
          className={`${inputClass} mt-3`}
          value={get("mileageMax")}
          onChange={(e) => setParams({ mileageMax: e.target.value || null })}
        >
          <option value="">Any mileage</option>
          {[50000, 75000, 100000, 125000, 150000, 200000].map((m) => (
            <option key={m} value={m}>Under {m.toLocaleString()} mi</option>
          ))}
        </select>
      </div>

      {/* Body style */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">Body Style</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {BODY_STYLES.map((style) => (
            <label key={style} className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
              <input
                type="checkbox"
                checked={selectedBodies.includes(style)}
                onChange={() => toggleBody(style)}
                className="h-4 w-4 accent-[#CC0000]"
              />
              {style}
            </label>
          ))}
        </div>
      </div>

      {/* Fuel / transmission / drivetrain */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">Fuel Type</h3>
          <select aria-label="Fuel type" className={`${inputClass} mt-2`} value={get("fuel")}
            onChange={(e) => setParams({ fuel: e.target.value || null })}>
            <option value="">Any</option>
            {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">Transmission</h3>
          <select aria-label="Transmission" className={`${inputClass} mt-2`} value={get("trans")}
            onChange={(e) => setParams({ trans: e.target.value || null })}>
            <option value="">Any</option>
            {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">Drivetrain</h3>
          <select aria-label="Drivetrain" className={`${inputClass} mt-2`} value={get("drive")}
            onChange={(e) => setParams({ drive: e.target.value || null })}>
            <option value="">Any</option>
            {DRIVETRAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="w-full rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Quick filter chips */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {QUICK_FILTERS.map((qf) => (
          <button
            key={qf.label}
            type="button"
            onClick={() => toggleQuickFilter(qf.params)}
            className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeQuickFilter(qf.params)
                ? "border-accent bg-accent text-white"
                : "border-border-subtle text-text-secondary hover:border-accent hover:text-text-primary"
            }`}
          >
            {qf.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:border-accent lg:hidden"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          Filters
        </button>
        <p className="hidden text-sm text-text-secondary lg:block" aria-live="polite">
          {vehicles.length}{hasMore ? "+" : ""} vehicle{vehicles.length === 1 ? "" : "s"}
          {isPending && " · updating…"}
        </p>
        <select
          aria-label="Sort vehicles"
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary transition-colors duration-200 focus:border-accent focus:outline-none"
          value={get("sort") || "newest"}
          onChange={(e) => setParams({ sort: e.target.value === "newest" ? null : e.target.value })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 flex gap-8">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 flex-shrink-0 lg:block" aria-label="Inventory filters">
          {filters}
        </aside>

        {/* Grid */}
        <div className="min-w-0 flex-1">
          {vehicles.length > 0 ? (
            <>
              <div className={`grid grid-cols-1 gap-5 transition-opacity duration-300 sm:grid-cols-2 xl:grid-cols-3 ${isPending ? "opacity-60" : "opacity-100"}`}>
                {vehicles.map((v, i) => (
                  <Reveal key={`${filterEpoch}-${v.id}`} variant="up" delay={(i % 12) * 60}>
                    <VehicleCard vehicle={v} />
                  </Reveal>
                ))}
              </div>
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setParams({ page: String(page + 1) }, false)}
                    className="rounded-md border border-border-subtle px-8 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent disabled:opacity-60"
                  >
                    {isPending ? "Loading…" : "Load More Vehicles"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-border-subtle bg-background-card p-10 text-center">
              <h3 className="text-lg font-semibold text-text-primary">
                No vehicles match those filters
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
                Our inventory turns over quickly. Try widening your filters — or let our AI
                matchmaker find the closest fit to what you actually need.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-md border border-border-subtle px-5 py-2.5 text-sm font-medium text-text-primary hover:border-accent"
                >
                  Clear Filters
                </button>
                <Link
                  href="/#matchmaker"
                  className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Find My Match
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer (kept mounted; classes drive the slide/fade) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-background-secondary p-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle text-text-secondary"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>
            {filters}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-6 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              Show Results
            </button>
        </div>
      </div>
    </div>
  );
}
