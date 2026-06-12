import Link from "next/link";
import { notFound } from "next/navigation";
import SupabaseNotice from "../../_components/SupabaseNotice";
import { safeQuery, adminDbReady, formatDateTime } from "../../_lib/adminData";
import type { Lead, LeadEvent } from "@/types/lead";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-text-primary">{value}</dd>
    </div>
  );
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, events] = await Promise.all([
    safeQuery<Lead | null>(null, async (sb) => {
      const { data, error } = await sb
        .from("leads")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Lead | null;
    }),
    safeQuery<LeadEvent[]>([], async (sb) => {
      const { data, error } = await sb
        .from("lead_events")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadEvent[];
    }),
  ]);

  if (!lead && adminDbReady()) notFound();

  return (
    <div>
      <Link
        href="/admin/leads"
        className="text-xs font-semibold text-accent hover:underline"
      >
        ← Back to Leads
      </Link>

      <div className="mt-3">
        <SupabaseNotice />
      </div>

      {!lead ? (
        <p className="mt-6 text-sm text-text-muted">Lead data unavailable.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">
              {lead.first_name} {lead.last_name ?? ""}
            </h1>
            <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              {lead.lead_type}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                lead.dc_pushed
                  ? "bg-surface text-text-secondary"
                  : "bg-accent/20 text-accent"
              }`}
            >
              {lead.dc_pushed
                ? `DC pushed ${formatDateTime(lead.dc_pushed_at)}`
                : "Not pushed to DealerCenter"}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Received {formatDateTime(lead.created_at)}
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                <h2 className="text-sm font-bold text-text-primary">Contact</h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Phone"
                    value={
                      lead.phone && (
                        <a href={`tel:${lead.phone}`} className="text-accent hover:underline">
                          {lead.phone}
                        </a>
                      )
                    }
                  />
                  <Field
                    label="Email"
                    value={
                      lead.email && (
                        <a href={`mailto:${lead.email}`} className="text-accent hover:underline">
                          {lead.email}
                        </a>
                      )
                    }
                  />
                  <Field label="Source URL" value={lead.source_url} />
                </dl>
              </div>

              <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                <h2 className="text-sm font-bold text-text-primary">Details</h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Vehicle"
                    value={
                      lead.vehicle_id && (
                        <Link
                          href={`/admin/inventory/${lead.vehicle_id}`}
                          className="text-accent hover:underline"
                        >
                          View vehicle →
                        </Link>
                      )
                    }
                  />
                  <Field label="VIN" value={lead.vin} />
                  <Field label="Stock #" value={lead.stock_number} />
                  <Field label="Budget" value={lead.budget} />
                  <Field label="Down Payment" value={lead.down_payment} />
                  <Field label="Monthly Goal" value={lead.monthly_payment_goal} />
                  <Field label="Preferred Date" value={lead.preferred_date} />
                  <Field label="Preferred Time" value={lead.preferred_time} />
                  <Field
                    label="Trade Vehicle"
                    value={
                      (lead.trade_year || lead.trade_make || lead.trade_model) &&
                      `${lead.trade_year ?? ""} ${lead.trade_make ?? ""} ${lead.trade_model ?? ""}`.trim()
                    }
                  />
                  <Field
                    label="Trade Mileage"
                    value={lead.trade_mileage?.toLocaleString()}
                  />
                  <Field label="Trade Payoff" value={lead.trade_payoff} />
                  <Field label="Trade VIN" value={lead.trade_vin} />
                </dl>
                {lead.message && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                      Message
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-surface p-3 text-sm text-text-primary">
                      {lead.message}
                    </p>
                  </div>
                )}
                {lead.chat_summary && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                      Chat Summary
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-surface p-3 text-sm text-text-primary">
                      {lead.chat_summary}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-lg border border-border-subtle bg-background-card p-6">
              <h2 className="text-sm font-bold text-text-primary">Timeline</h2>
              {events.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">No events recorded.</p>
              ) : (
                <ol className="mt-4 space-y-4 border-l border-border-subtle pl-4">
                  {events.map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                      <p className="text-sm font-semibold text-text-primary">
                        {ev.event_type}
                      </p>
                      {ev.notes && (
                        <p className="mt-0.5 text-xs text-text-secondary">{ev.notes}</p>
                      )}
                      <p className="tabular mt-0.5 text-[11px] text-text-muted">
                        {formatDateTime(ev.created_at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
