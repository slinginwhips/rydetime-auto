import Link from "next/link";
import SupabaseNotice from "./_components/SupabaseNotice";
import { safeQuery, formatDateTime } from "./_lib/adminData";
import type { Lead } from "@/types/lead";

export const dynamic = "force-dynamic";

interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  vehicles_added: number | null;
  vehicles_updated: number | null;
  vehicles_sold: number | null;
  vehicles_unchanged: number | null;
  error_message: string | null;
}

export default async function AdminDashboardPage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [newLeadsToday, activeCount, lastSync, syncErrors, hotLeads] =
    await Promise.all([
      safeQuery(0, async (sb) => {
        const { count, error } = await sb
          .from("leads")
          .select("id", { count: "exact", head: true })
          .gte("created_at", todayStart.toISOString());
        if (error) throw error;
        return count ?? 0;
      }),
      safeQuery(0, async (sb) => {
        const { count, error } = await sb
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .in("status", ["active", "fresh_arrival", "hold_pending"]);
        if (error) throw error;
        return count ?? 0;
      }),
      safeQuery<SyncLog | null>(null, async (sb) => {
        const { data, error } = await sb
          .from("inventory_sync_logs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data as SyncLog | null;
      }),
      safeQuery<SyncLog[]>([], async (sb) => {
        const { data, error } = await sb
          .from("inventory_sync_logs")
          .select("*")
          .eq("status", "error")
          .order("started_at", { ascending: false })
          .limit(5);
        if (error) throw error;
        return (data ?? []) as SyncLog[];
      }),
      safeQuery<Lead[]>([], async (sb) => {
        const { data, error } = await sb
          .from("leads")
          .select("*")
          .in("lead_type", ["chat", "hold", "test_drive"])
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) throw error;
        return (data ?? []) as Lead[];
      }),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      <p className="mt-1 text-sm text-text-secondary">
        RydeTime Auto — operations overview
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/leads?tab=today"
          className="rounded-lg border border-border-subtle bg-background-card p-5 transition-colors hover:border-accent"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            New Leads Today
          </p>
          <p className="tabular mt-2 text-3xl font-bold text-text-primary">
            {newLeadsToday}
          </p>
        </Link>
        <Link
          href="/admin/inventory"
          className="rounded-lg border border-border-subtle bg-background-card p-5 transition-colors hover:border-accent"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Active Vehicles
          </p>
          <p className="tabular mt-2 text-3xl font-bold text-text-primary">
            {activeCount}
          </p>
        </Link>
        <Link
          href="/admin/sync"
          className="rounded-lg border border-border-subtle bg-background-card p-5 transition-colors hover:border-accent"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Last Sync
          </p>
          <p className="mt-2 text-base font-semibold text-text-primary">
            {lastSync ? formatDateTime(lastSync.started_at) : "Never"}
          </p>
          {lastSync && (
            <p
              className={`mt-1 text-xs font-semibold uppercase ${
                lastSync.status === "success" || lastSync.status === "completed"
                  ? "text-text-secondary"
                  : "text-accent"
              }`}
            >
              {lastSync.status}
              {lastSync.status !== "error" &&
                ` · +${lastSync.vehicles_added ?? 0} / ~${lastSync.vehicles_updated ?? 0} / sold ${lastSync.vehicles_sold ?? 0}`}
            </p>
          )}
        </Link>
      </div>

      {/* Sync errors */}
      {syncErrors.length > 0 && (
        <div className="mt-6 rounded-lg border border-accent/40 bg-background-card p-5">
          <h2 className="text-sm font-bold text-text-primary">
            Recent Sync Errors
          </h2>
          <ul className="mt-3 space-y-2">
            {syncErrors.map((log) => (
              <li key={log.id} className="text-xs text-text-secondary">
                <span className="tabular text-text-muted">
                  {formatDateTime(log.started_at)}
                </span>{" "}
                — <span className="text-accent">{log.error_message ?? "Unknown error"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hot leads */}
      <div className="mt-6 rounded-lg border border-border-subtle bg-background-card">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-sm font-bold text-text-primary">
            Hot Leads{" "}
            <span className="ml-1 text-xs font-normal text-text-muted">
              chat · holds · test drives
            </span>
          </h2>
          <Link
            href="/admin/leads?tab=hot"
            className="text-xs font-semibold text-accent hover:underline"
          >
            View all →
          </Link>
        </div>
        {hotLeads.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-muted">
            No hot leads yet.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {hotLeads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-surface"
                >
                  <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                    {lead.lead_type}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {lead.first_name} {lead.last_name ?? ""}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {lead.phone || lead.email || "no contact info"}
                  </span>
                  <span className="tabular ml-auto text-xs text-text-muted">
                    {formatDateTime(lead.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
