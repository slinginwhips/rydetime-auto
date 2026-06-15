"use client";

import { useState } from "react";
import Link from "next/link";
import AppointmentRequestForm from "@/components/AppointmentRequestForm";
import HoldVehicleFlow from "@/components/HoldVehicleFlow";
import CarfaxButton from "@/components/CarfaxButton";
import CarfaxBadges from "@/components/CarfaxBadges";
import ShareBar from "@/components/ShareBar";
import { openChatForVehicle } from "@/components/VehicleCard";
import { DEALERSHIP } from "@/lib/dealership";

interface VDPActionsProps {
  vehicle: {
    id: string;
    label: string;
    price: number;
    vin: string;
    carfaxUrl: string;
    status: string;
    carfaxBadges: {
      oneOwner: boolean;
      accidentFree: boolean;
      serviceRecords: boolean;
      greatValue: boolean;
    };
  };
}

/** Sticky right-column CTA stack on the vehicle detail page. */
export default function VDPActions({ vehicle }: VDPActionsProps) {
  const [testDriveOpen, setTestDriveOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);

  return (
    <div className="space-y-2.5">
      <Link
        href="/credit-application"
        className="shimmer-hover block w-full rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Get Approved
      </Link>
      <button
        type="button"
        onClick={() => setTestDriveOpen(true)}
        className="w-full rounded-md border border-border-subtle px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent"
      >
        Schedule Test Drive
      </button>
      {vehicle.status !== "hold_pending" && (
        <button
          type="button"
          onClick={() => setHoldOpen(true)}
          className="w-full rounded-md border border-border-subtle px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent"
        >
          Hold This Vehicle
        </button>
      )}
      <Link
        href={`/trade-in?vehicle=${vehicle.id}`}
        className="block w-full rounded-md border border-border-subtle px-4 py-3 text-center text-sm font-semibold text-text-primary transition-colors hover:border-accent"
      >
        Value My Trade-In
      </Link>
      <button
        type="button"
        onClick={() => openChatForVehicle(vehicle.id)}
        className="w-full rounded-md border border-accent px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-accent hover:text-white"
      >
        Ask AI About This Vehicle
      </button>

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <a
          href={DEALERSHIP.phoneHref}
          className="rounded-md border border-border-subtle px-4 py-3 text-center text-sm font-medium text-text-primary transition-colors hover:border-accent"
        >
          Call Us
        </a>
        <a
          href={DEALERSHIP.smsHref}
          className="rounded-md border border-border-subtle px-4 py-3 text-center text-sm font-medium text-text-primary transition-colors hover:border-accent"
        >
          Text Us
        </a>
      </div>

      <div className="space-y-2.5 pt-1">
        <CarfaxBadges
          oneOwner={vehicle.carfaxBadges.oneOwner}
          accidentFree={vehicle.carfaxBadges.accidentFree}
          serviceRecords={vehicle.carfaxBadges.serviceRecords}
          greatValue={vehicle.carfaxBadges.greatValue}
          href={vehicle.carfaxUrl}
          className="justify-center"
        />
        <CarfaxButton vin={vehicle.vin} href={vehicle.carfaxUrl} />
      </div>

      <div className="flex justify-center pt-2">
        <ShareBar title={vehicle.label} />
      </div>

      {/* Test drive modal */}
      {testDriveOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Schedule a test drive"
          onClick={() => setTestDriveOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-border-subtle bg-background-card p-5 sm:max-w-lg sm:rounded-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <AppointmentRequestForm
              vehicleId={vehicle.id}
              vehicleLabel={vehicle.label}
              onClose={() => setTestDriveOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Hold flow modal */}
      <HoldVehicleFlow
        vehicle={{ id: vehicle.id, label: vehicle.label, price: vehicle.price }}
        open={holdOpen}
        onClose={() => setHoldOpen(false)}
      />
    </div>
  );
}
