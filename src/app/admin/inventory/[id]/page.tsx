import Link from "next/link";
import { notFound } from "next/navigation";
import SupabaseNotice from "../../_components/SupabaseNotice";
import VehicleEditorForm from "../../_components/VehicleEditorForm";
import { safeQuery, adminDbReady, formatDateTime } from "../../_lib/adminData";
import type { Vehicle } from "@/types/vehicle";

export const dynamic = "force-dynamic";

export default async function AdminVehicleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vehicle = await safeQuery<Vehicle | null>(null, async (sb) => {
    const { data, error } = await sb
      .from("vehicles")
      .select("*, vehicle_photos(*), vehicle_features(*), vehicle_prep_badges(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Vehicle | null;
  });

  if (!vehicle && adminDbReady()) notFound();

  return (
    <div>
      <Link
        href="/admin/inventory"
        className="text-xs font-semibold text-accent hover:underline"
      >
        ← Back to Inventory
      </Link>

      <div className="mt-3">
        <SupabaseNotice />
      </div>

      {!vehicle ? (
        <p className="mt-6 text-sm text-text-muted">
          Vehicle data unavailable.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-2xl font-bold text-text-primary">
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim ?? ""}
            </h1>
            <span className="tabular text-sm text-text-secondary">
              ${Number(vehicle.price).toLocaleString()} ·{" "}
              {vehicle.mileage.toLocaleString()} mi · #{vehicle.stock_number}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            VIN {vehicle.vin} · Last synced {formatDateTime(vehicle.dc_last_synced)} ·{" "}
            <Link
              href={`/inventory/${vehicle.slug}`}
              className="text-accent hover:underline"
              target="_blank"
            >
              View public page →
            </Link>
          </p>

          <div className="mt-6 rounded-lg border border-border-subtle bg-background-card p-6">
            <VehicleEditorForm vehicle={vehicle} />
          </div>
        </>
      )}
    </div>
  );
}
