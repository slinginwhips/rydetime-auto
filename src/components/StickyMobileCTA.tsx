"use client";

import Link from "next/link";
import { DEALERSHIP } from "@/lib/dealership";
import { openChatForVehicle } from "@/components/VehicleCard";

interface StickyMobileCTAProps {
  vehicleId: string;
}

export default function StickyMobileCTA({ vehicleId }: StickyMobileCTAProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-background/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-4 gap-1.5 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <a
          href={DEALERSHIP.phoneHref}
          className="flex flex-col items-center gap-0.5 rounded-md border border-border-subtle py-2 text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span className="text-[11px] font-medium">Call</span>
        </a>
        <a
          href={DEALERSHIP.smsHref}
          className="flex flex-col items-center gap-0.5 rounded-md border border-border-subtle py-2 text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[11px] font-medium">Text</span>
        </a>
        <Link
          href="/credit-application"
          className="flex flex-col items-center gap-0.5 rounded-md bg-accent py-2 text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-[11px] font-semibold">Get Approved</span>
        </Link>
        <button
          type="button"
          onClick={() => openChatForVehicle(vehicleId)}
          className="flex flex-col items-center gap-0.5 rounded-md border border-accent py-2 text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="3" x2="12" y2="9" />
            <line x1="12" y1="15" x2="12" y2="21" />
            <line x1="3" y1="12" x2="9" y2="12" />
            <line x1="15" y1="12" x2="21" y2="12" />
          </svg>
          <span className="text-[11px] font-medium">Ask AI</span>
        </button>
      </div>
    </div>
  );
}
