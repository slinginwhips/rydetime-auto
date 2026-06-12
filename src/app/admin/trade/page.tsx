import Link from "next/link";
import SupabaseNotice from "../_components/SupabaseNotice";
import { safeQuery, formatDateTime } from "../_lib/adminData";
import type { TradeRequest, Lead } from "@/types/lead";

export const dynamic = "force-dynamic";

type TradeRow = TradeRequest & {
  leads: Pick<Lead, "id" | "first_name" | "last_name" | "phone" | "email"> | null;
};

export default async function AdminTradePage() {
  const trades = await safeQuery<TradeRow[]>([], async (sb) => {
    const { data, error } = await sb
      .from("trade_requests")
      .select("*, leads(id, first_name, last_name, phone, email)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as TradeRow[];
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Trade Requests</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Trade-ins and sell-us-your-car submissions. Values quoted online are
        estimates only — confirm after inspection.
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      {trades.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-background-card p-10 text-center text-sm text-text-muted">
          No trade requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {trades.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-border-subtle bg-background-card p-5"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h2 className="text-base font-bold text-text-primary">
                  {t.year ?? "?"} {t.make ?? ""} {t.model ?? ""}
                </h2>
                {t.condition && (
                  <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    {t.condition}
                  </span>
                )}
                {t.title_status && (
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      t.title_status === "Clean"
                        ? "bg-surface text-text-secondary"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    Title: {t.title_status}
                  </span>
                )}
                <span className="tabular ml-auto text-xs text-text-muted">
                  {formatDateTime(t.created_at)}
                </span>
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
                {t.leads && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Customer
                    </dt>
                    <dd>
                      <Link
                        href={`/admin/leads/${t.leads.id}`}
                        className="font-semibold text-text-primary hover:text-accent"
                      >
                        {t.leads.first_name} {t.leads.last_name ?? ""}
                      </Link>
                      <span className="block text-xs text-text-muted">
                        {t.leads.phone || t.leads.email || ""}
                      </span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    VIN
                  </dt>
                  <dd className="tabular text-text-secondary">{t.vin ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Mileage
                  </dt>
                  <dd className="tabular text-text-secondary">
                    {t.mileage ? t.mileage.toLocaleString() : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Payoff / Lender
                  </dt>
                  <dd className="text-text-secondary">
                    {t.payoff_amount ?? "—"}
                    {t.lender ? ` · ${t.lender}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Warning Lights
                  </dt>
                  <dd className={t.warning_lights ? "text-accent" : "text-text-secondary"}>
                    {t.warning_lights == null ? "—" : t.warning_lights ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Accident History
                  </dt>
                  <dd className={t.accident_history ? "text-accent" : "text-text-secondary"}>
                    {t.accident_history == null ? "—" : t.accident_history ? "Yes" : "No"}
                  </dd>
                </div>
                {t.photos_urls && t.photos_urls.length > 0 && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Photos
                    </dt>
                    <dd className="text-text-secondary">
                      {t.photos_urls.length} uploaded
                    </dd>
                  </div>
                )}
              </dl>

              {t.notes && (
                <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface p-3 text-xs text-text-secondary">
                  {t.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
