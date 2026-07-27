import Link from "next/link";
import SupabaseNotice from "../_components/SupabaseNotice";
import SoldToggle from "../_components/SoldToggle";
import { safeQuery } from "../_lib/adminData";
import type { Vehicle } from "@/types/vehicle";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const vehicles = await safeQuery<Vehicle[]>([], async (sb) => {
    const { data, error } = await sb
      .from("vehicles")
      .select("*, vehicle_photos(url, is_primary, sort_order)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Vehicle[];
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Inventory</h1>
      <p className="mt-1 text-sm text-text-secondary">
        All vehicles, any status. Vehicle data syncs from DealerCenter once a
        day, so a car you just sold stays listed until tomorrow morning — hit{" "}
        <strong className="text-text-primary">Mark sold</strong> to pull it off
        the website right now. The change sticks through the next sync.
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-background-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  No vehicles found.
                </td>
              </tr>
            )}
            {vehicles.map((v) => {
              const photo =
                v.vehicle_photos?.find((p) => p.is_primary)?.url ??
                v.vehicle_photos?.[0]?.url;
              return (
                <tr key={v.id} className="hover:bg-surface">
                  <td className="px-4 py-3">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        className="h-10 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-16 items-center justify-center rounded bg-surface text-[10px] text-text-muted">
                        No photo
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text-primary">
                      {v.year} {v.make} {v.model} {v.trim ?? ""}
                    </p>
                    <p className="text-xs text-text-muted">
                      #{v.stock_number} · {v.mileage.toLocaleString()} mi
                    </p>
                  </td>
                  <td className="tabular px-4 py-3 font-semibold text-text-primary">
                    ${Number(v.price).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        v.status === "sold"
                          ? "bg-surface text-text-muted"
                          : v.status === "hold_pending"
                            ? "bg-accent/20 text-accent"
                            : "bg-surface text-text-primary"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {v.featured && (
                      <span className="mr-1 text-accent">★ Featured</span>
                    )}
                    {v.ryans_pick && (
                      <span className="text-text-secondary">Ryan&apos;s Pick</span>
                    )}
                    {!v.featured && !v.ryans_pick && (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="tabular px-4 py-3 text-text-secondary">
                    {v.days_in_inventory}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <SoldToggle
                        vehicleId={v.id}
                        status={v.status}
                        label={`${v.year} ${v.make} ${v.model}`}
                      />
                      <Link
                        href={`/admin/inventory/${v.id}`}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Edit →
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
