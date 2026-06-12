import Link from "next/link";
import SupabaseNotice from "../_components/SupabaseNotice";
import { safeQuery, formatDateTime } from "../_lib/adminData";
import type { AppointmentRequest, Lead } from "@/types/lead";
import type { Vehicle } from "@/types/vehicle";

export const dynamic = "force-dynamic";

type AppointmentRow = AppointmentRequest & {
  leads: Pick<Lead, "id" | "first_name" | "last_name" | "phone" | "email"> | null;
  vehicles: Pick<Vehicle, "id" | "year" | "make" | "model" | "stock_number"> | null;
};

export default async function AdminAppointmentsPage() {
  const appointments = await safeQuery<AppointmentRow[]>([], async (sb) => {
    const { data, error } = await sb
      .from("appointments")
      .select(
        "*, leads(id, first_name, last_name, phone, email), vehicles(id, year, make, model, stock_number)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as AppointmentRow[];
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Appointments</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Test drive and visit requests — confirm by phone or text.
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-background-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Requested Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  No appointment requests yet.
                </td>
              </tr>
            )}
            {appointments.map((a) => (
              <tr key={a.id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  {a.leads ? (
                    <Link
                      href={`/admin/leads/${a.leads.id}`}
                      className="font-semibold text-text-primary hover:text-accent"
                    >
                      {a.leads.first_name} {a.leads.last_name ?? ""}
                    </Link>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                  <p className="text-xs text-text-muted">
                    {a.leads?.phone || a.leads?.email || ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {a.vehicles ? (
                    <Link
                      href={`/admin/inventory/${a.vehicles.id}`}
                      className="hover:text-accent"
                    >
                      {a.vehicles.year} {a.vehicles.make} {a.vehicles.model}
                      <span className="block text-xs text-text-muted">
                        #{a.vehicles.stock_number}
                      </span>
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-text-primary">
                  {a.preferred_date}{" "}
                  <span className="text-text-secondary">{a.preferred_time}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      a.confirmed
                        ? "bg-surface text-text-secondary"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {a.confirmed ? "Confirmed" : "Pending"}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-text-secondary">
                  {a.notes ?? "—"}
                </td>
                <td className="tabular px-4 py-3 text-xs text-text-muted">
                  {formatDateTime(a.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
