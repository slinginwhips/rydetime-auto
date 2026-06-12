import Link from "next/link";
import SupabaseNotice from "../_components/SupabaseNotice";
import { safeQuery, formatDateTime } from "../_lib/adminData";
import type { HoldDeposit, Lead } from "@/types/lead";
import type { Vehicle } from "@/types/vehicle";

export const dynamic = "force-dynamic";

type HoldRow = HoldDeposit & {
  leads: Pick<Lead, "id" | "first_name" | "last_name" | "phone" | "email"> | null;
  vehicles: Pick<
    Vehicle,
    "id" | "year" | "make" | "model" | "stock_number" | "status"
  > | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-accent/20 text-accent",
  confirmed: "bg-surface text-text-primary",
  released: "bg-surface text-text-muted",
  forfeited: "bg-surface text-text-muted",
};

export default async function AdminHoldsPage() {
  const holds = await safeQuery<HoldRow[]>([], async (sb) => {
    const { data, error } = await sb
      .from("hold_deposits")
      .select(
        "*, leads(id, first_name, last_name, phone, email), vehicles(id, year, make, model, stock_number, status)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as HoldRow[];
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Hold Deposits</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Holds are <strong className="text-text-primary">not auto-confirmed</strong> —
        verify the payment in Stripe, then confirm with the customer manually.
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-background-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Policy Ack.</th>
              <th className="px-4 py-3">Stripe Ref</th>
              <th className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {holds.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  No hold deposits yet.
                </td>
              </tr>
            )}
            {holds.map((h) => (
              <tr key={h.id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  {h.leads ? (
                    <Link
                      href={`/admin/leads/${h.leads.id}`}
                      className="font-semibold text-text-primary hover:text-accent"
                    >
                      {h.leads.first_name} {h.leads.last_name ?? ""}
                    </Link>
                  ) : (
                    "—"
                  )}
                  <p className="text-xs text-text-muted">
                    {h.leads?.phone || h.leads?.email || ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {h.vehicles ? (
                    <Link
                      href={`/admin/inventory/${h.vehicles.id}`}
                      className="hover:text-accent"
                    >
                      {h.vehicles.year} {h.vehicles.make} {h.vehicles.model}
                      <span className="block text-xs text-text-muted">
                        #{h.vehicles.stock_number} · {h.vehicles.status}
                      </span>
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="tabular px-4 py-3 font-semibold text-text-primary">
                  ${Number(h.amount).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[h.status] ?? "bg-surface text-text-secondary"}`}
                  >
                    {h.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {h.acknowledged_policy ? (
                    <span className="text-text-secondary">✓ Acknowledged</span>
                  ) : (
                    <span className="text-accent">Missing</span>
                  )}
                </td>
                <td className="tabular max-w-[160px] truncate px-4 py-3 text-xs text-text-muted">
                  {h.stripe_payment_intent_id ?? "—"}
                </td>
                <td className="tabular px-4 py-3 text-xs text-text-muted">
                  {formatDateTime(h.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
