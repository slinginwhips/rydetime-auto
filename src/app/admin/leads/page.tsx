import Link from "next/link";
import SupabaseNotice from "../_components/SupabaseNotice";
import { safeQuery, formatDateTime } from "../_lib/adminData";
import type { Lead, LeadType } from "@/types/lead";

export const dynamic = "force-dynamic";

const HOT_TYPES: LeadType[] = ["chat", "hold", "test_drive"];
const ALL_TYPES: LeadType[] = [
  "inquiry",
  "test_drive",
  "trade",
  "finance",
  "hold",
  "chat",
  "matchmaker",
  "price_drop",
  "carfax",
];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string }>;
}) {
  const { tab = "all", type } = await searchParams;
  const leadType = ALL_TYPES.includes(type as LeadType)
    ? (type as LeadType)
    : undefined;

  const leads = await safeQuery<Lead[]>([], async (sb) => {
    let q = sb.from("leads").select("*").order("created_at", { ascending: false }).limit(200);
    if (tab === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      q = q.gte("created_at", todayStart.toISOString());
    } else if (tab === "hot") {
      q = q.in("lead_type", HOT_TYPES);
    }
    if (leadType) q = q.eq("lead_type", leadType);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Lead[];
  });

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "bg-accent text-white"
        : "bg-surface text-text-secondary hover:text-text-primary"
    }`;

  const withParams = (nextTab: string, nextType?: string) => {
    const p = new URLSearchParams();
    if (nextTab !== "all") p.set("tab", nextTab);
    if (nextType) p.set("type", nextType);
    const qs = p.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {leads.length} lead{leads.length === 1 ? "" : "s"} shown
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={withParams("today", type)} className={tabClass(tab === "today")}>
          New Today
        </Link>
        <Link href={withParams("hot", type)} className={tabClass(tab === "hot")}>
          Hot
        </Link>
        <Link href={withParams("all", type)} className={tabClass(tab === "all")}>
          All
        </Link>
        <span className="mx-2 h-4 w-px bg-border-subtle" />
        <Link href={withParams(tab)} className={tabClass(!leadType)}>
          Any type
        </Link>
        {ALL_TYPES.map((t) => (
          <Link key={t} href={withParams(tab, t)} className={tabClass(leadType === t)}>
            {t}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border-subtle bg-background-card">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">DC</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  No leads match this filter.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-surface">
                <td className="px-4 py-3 font-semibold text-text-primary">
                  {lead.first_name} {lead.last_name ?? ""}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                    {lead.lead_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {lead.phone && <p>{lead.phone}</p>}
                  {lead.email && <p>{lead.email}</p>}
                  {!lead.phone && !lead.email && "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {lead.dc_pushed ? (
                    <span className="text-text-secondary">✓ Pushed</span>
                  ) : (
                    <span className="text-text-muted">Not pushed</span>
                  )}
                </td>
                <td className="tabular px-4 py-3 text-xs text-text-muted">
                  {formatDateTime(lead.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
