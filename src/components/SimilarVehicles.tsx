"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/Logo";
import { estimateMonthlyPayment, type VehicleCard } from "@/types/vehicle";

interface SimilarVehiclesProps {
  vehicles: VehicleCard[];
}

export default function SimilarVehicles({ vehicles }: SimilarVehiclesProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  const scrollByCards = (dir: -1 | 1) => {
    stripRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  if (!vehicles.length) return null;
  return (
    <div className="relative">
      {vehicles.length > 1 && (
        <div className="absolute -top-12 right-0 hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Scroll to previous similar vehicles"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors duration-200 hover:border-accent hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Scroll to next similar vehicles"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors duration-200 hover:border-accent hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
      <div
        ref={stripRef}
        className="scroll-momentum -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
      {vehicles.map((v) => {
        const title = [v.year, v.make, v.model].join(" ");
        return (
          <Link
            key={v.id}
            href={`/inventory/${v.slug}`}
            className="group w-64 flex-shrink-0 snap-start overflow-hidden rounded-lg border border-border-subtle bg-background-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent"
          >
            <div className="relative aspect-[4/3] bg-background-secondary">
              {v.primary_photo_url ? (
                <Image
                  src={v.primary_photo_url}
                  alt={title}
                  fill
                  sizes="256px"
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Logo variant="dark" className="h-8 w-auto opacity-30" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="truncate text-sm font-semibold text-text-primary">
                {title}
                {v.trim && <span className="text-text-secondary"> {v.trim}</span>}
              </h3>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="tabular text-base font-bold text-text-primary">
                  ${v.price.toLocaleString()}
                </span>
                <span className="tabular text-xs text-text-secondary">
                  {v.mileage.toLocaleString()} mi
                </span>
              </div>
              <p className="tabular mt-0.5 text-xs text-text-muted">
                Est. ${estimateMonthlyPayment(v.price).toLocaleString()}/mo
              </p>
            </div>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
