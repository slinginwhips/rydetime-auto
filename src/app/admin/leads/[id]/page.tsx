import Link from "next/link";
import { notFound } from "next/navigation";
import SupabaseNotice from "../../_components/SupabaseNotice";
import BdcReply from "../../_components/BdcReply";
import { safeQuery, adminDbReady, formatDateTime } from "../../_lib/adminData";
import type { Lead, LeadEvent, CreditApplication, BdcMessage, BdcAttachment } from "@/types/lead";

type BdcAttachmentWithUrl = BdcAttachment & { url: string | null };

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </dt>
      {/* Marketplace source URLs are one long unbroken token — wrap mid-word
          so they stay inside the card instead of spilling over it. */}
      <dd className="mt-0.5 break-all text-sm text-text-primary">{value}</dd>
    </div>
  );
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, events, creditApp, messages, attachments] = await Promise.all([
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
    safeQuery<CreditApplication | null>(null, async (sb) => {
      const { data, error } = await sb
        .from("credit_applications")
        .select("*")
        .eq("lead_id", id)
        .maybeSingle();
      if (error) throw error;
      return data as CreditApplication | null;
    }),
    safeQuery<BdcMessage[]>([], async (sb) => {
      const { data, error } = await sb
        .from("bdc_messages")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BdcMessage[];
    }),
    safeQuery<BdcAttachmentWithUrl[]>([], async (sb) => {
      const { data, error } = await sb
        .from("bdc_attachments")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as BdcAttachment[];
      // Private bucket — mint short-lived signed URLs so the rep can view files.
      const withUrls: BdcAttachmentWithUrl[] = [];
      for (const a of rows) {
        const { data: signed } = await sb.storage
          .from("bdc-attachments")
          .createSignedUrl(a.storage_path, 3600);
        withUrls.push({ ...a, url: signed?.signedUrl ?? null });
      }
      return withUrls;
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
            {lead.source && (
              <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                via {lead.source}
              </span>
            )}
            {lead.bdc_status && (
              <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                BDC: {lead.bdc_status}
              </span>
            )}
            {lead.opted_out && (
              <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                Opted out
              </span>
            )}
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

              {(messages.length > 0 || lead.reply_target) && (
                <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                  <h2 className="text-sm font-bold text-text-primary">Conversation</h2>
                  {messages.length === 0 ? (
                    <p className="mt-4 text-sm text-text-muted">No messages yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {messages.map((m) => {
                        const outbound = m.direction === "outbound";
                        return (
                          <div key={m.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                outbound ? "bg-accent/15" : "bg-surface"
                              } text-text-primary`}
                            >
                              <p className="whitespace-pre-wrap">{m.body}</p>
                              <p className="mt-1 text-[10px] text-text-muted">
                                {outbound ? "BDC" : "Customer"} · {formatDateTime(m.created_at)}
                                {outbound && !m.sent && ` · draft — not sent${m.skip_reason ? ` (${m.skip_reason})` : ""}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <BdcReply
                    leadId={lead.id}
                    channel={lead.reply_channel ?? null}
                    disabled={Boolean(lead.opted_out) || !lead.reply_target}
                    disabledReason={
                      lead.opted_out
                        ? "Customer opted out (STOP) — messaging disabled."
                        : "No contact rail on this lead."
                    }
                  />
                </div>
              )}

              {attachments.length > 0 && (
                <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                  <h2 className="text-sm font-bold text-text-primary">
                    Attachments{" "}
                    <span className="text-xs font-normal text-text-muted">({attachments.length})</span>
                  </h2>
                  <p className="mt-1 text-xs text-text-muted">Documents the customer texted in. Links expire after 1 hour.</p>
                  <ul className="mt-4 space-y-2">
                    {attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-text-primary">
                          {a.filename ?? a.storage_path.split("/").pop()}{" "}
                          <span className="text-text-muted">· {a.content_type ?? "file"}</span>
                        </span>
                        {a.url ? (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-semibold text-accent hover:underline"
                          >
                            View →
                          </a>
                        ) : (
                          <span className="shrink-0 text-xs text-text-muted">unavailable</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {creditApp && (
                <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-text-primary">
                      Signed Credit Application
                    </h2>
                    <span className="text-[11px] text-text-muted">
                      Signed {formatDateTime(creditApp.signed_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    Full SSN is not stored — it was transmitted to DealerCenter. Last 4 shown for reference.
                  </p>

                  <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-accent">
                    Applicant
                  </h3>
                  <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Name"
                      value={`${creditApp.first_name} ${creditApp.middle_name ?? ""} ${creditApp.last_name}`.replace(/\s+/g, " ").trim()}
                    />
                    <Field label="Date of Birth" value={creditApp.dob} />
                    <Field label="SSN" value={creditApp.ssn_last4 ? `***-**-${creditApp.ssn_last4}` : null} />
                    <Field label="Driver's License" value={creditApp.drivers_license} />
                    <Field
                      label="Address"
                      value={[creditApp.address, creditApp.city, creditApp.state, creditApp.zip].filter(Boolean).join(", ") || null}
                    />
                    <Field label="Housing" value={creditApp.housing_status} />
                    <Field
                      label="Time at Address"
                      value={[creditApp.years_at_address && `${creditApp.years_at_address} yr`, creditApp.months_at_address && `${creditApp.months_at_address} mo`].filter(Boolean).join(" ") || null}
                    />
                    <Field label="Housing Payment" value={creditApp.monthly_housing_payment} />
                    <Field label="Previous Address" value={creditApp.prev_address} />
                  </dl>

                  <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-accent">
                    Employment &amp; Income
                  </h3>
                  <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="Status" value={creditApp.employment_status} />
                    <Field label="Employer" value={creditApp.employer_name} />
                    <Field label="Job Title" value={creditApp.job_title} />
                    <Field label="Work Phone" value={creditApp.work_phone} />
                    <Field
                      label="Time on Job"
                      value={[creditApp.years_employed && `${creditApp.years_employed} yr`, creditApp.months_employed && `${creditApp.months_employed} mo`].filter(Boolean).join(" ") || null}
                    />
                    <Field label="Gross Monthly Income" value={creditApp.gross_monthly_income} />
                    <Field label="Other Income" value={creditApp.other_income} />
                    <Field label="Other Income Source" value={creditApp.other_income_source} />
                  </dl>

                  {creditApp.co_first_name && (
                    <>
                      <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-accent">
                        Co-Applicant
                      </h3>
                      <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                        <Field label="Name" value={`${creditApp.co_first_name} ${creditApp.co_last_name ?? ""}`.trim()} />
                        <Field label="Relationship" value={creditApp.co_relationship} />
                        <Field label="Date of Birth" value={creditApp.co_dob} />
                        <Field label="SSN" value={creditApp.co_ssn_last4 ? `***-**-${creditApp.co_ssn_last4}` : null} />
                        <Field label="Phone" value={creditApp.co_phone} />
                        <Field label="Email" value={creditApp.co_email} />
                        <Field label="Employer" value={creditApp.co_employer_name} />
                        <Field label="Monthly Income" value={creditApp.co_gross_monthly_income} />
                      </dl>
                    </>
                  )}

                  <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-accent">
                    Deal &amp; Signature
                  </h3>
                  <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="Requested Down" value={creditApp.requested_down_payment} />
                    <Field label="Desired Monthly" value={creditApp.desired_monthly_payment} />
                    <Field label="Electronic Signature" value={creditApp.signature_name} />
                    <Field label="Credit-Pull Consent" value={creditApp.consent_credit_pull ? "Authorized" : "No"} />
                    <Field label="SMS Consent" value={creditApp.sms_consent ? "Opted in" : "Not opted in"} />
                    <Field label="Signer IP" value={creditApp.signer_ip} />
                  </dl>
                </div>
              )}
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
