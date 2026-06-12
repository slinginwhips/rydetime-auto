import SupabaseNotice from "../_components/SupabaseNotice";
import RunSyncButton from "../_components/RunSyncButton";
import { safeQuery, formatDateTime } from "../_lib/adminData";

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
  feed_url: string | null;
}

export default async function AdminSyncPage() {
  const logs = await safeQuery<SyncLog[]>([], async (sb) => {
    const { data, error } = await sb
      .from("inventory_sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []) as SyncLog[];
  });

  const last = logs[0];
  const errors = logs.filter((l) => l.error_message);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Inventory Sync</h1>
      <p className="mt-1 text-sm text-text-secondary">
        DealerCenter is the source of truth — the site syncs automatically
        every 2 hours via cron, plus manual runs below.
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      {/* Last sync summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border-subtle bg-background-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Last Sync
          </h2>
          {last ? (
            <>
              <p className="mt-2 text-base font-semibold text-text-primary">
                {formatDateTime(last.started_at)}
              </p>
              <p
                className={`mt-1 text-xs font-bold uppercase tracking-wider ${
                  last.status === "error" ? "text-accent" : "text-text-secondary"
                }`}
              >
                {last.status}
              </p>
              <p className="tabular mt-2 text-sm text-text-secondary">
                +{last.vehicles_added ?? 0} added · {last.vehicles_updated ?? 0}{" "}
                updated · {last.vehicles_sold ?? 0} sold ·{" "}
                {last.vehicles_unchanged ?? 0} unchanged
              </p>
              {last.error_message && (
                <p className="mt-2 text-xs text-accent">{last.error_message}</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-text-muted">No syncs recorded yet.</p>
          )}
        </div>
        <RunSyncButton />
      </div>

      {/* Error log */}
      {errors.length > 0 && (
        <div className="mt-6 rounded-lg border border-accent/40 bg-background-card p-5">
          <h2 className="text-sm font-bold text-text-primary">Error Log</h2>
          <ul className="mt-3 space-y-2">
            {errors.map((l) => (
              <li key={l.id} className="text-xs">
                <span className="tabular text-text-muted">
                  {formatDateTime(l.started_at)}
                </span>{" "}
                — <span className="text-accent">{l.error_message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History table */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-border-subtle bg-background-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Sold</th>
              <th className="px-4 py-3">Unchanged</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-text-muted">
                  No sync history.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-surface">
                <td className="tabular px-4 py-3 text-xs text-text-secondary">
                  {formatDateTime(l.started_at)}
                </td>
                <td className="tabular px-4 py-3 text-xs text-text-secondary">
                  {formatDateTime(l.completed_at)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      l.status === "error"
                        ? "bg-accent/20 text-accent"
                        : "bg-surface text-text-secondary"
                    }`}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="tabular px-4 py-3 text-text-secondary">{l.vehicles_added ?? 0}</td>
                <td className="tabular px-4 py-3 text-text-secondary">{l.vehicles_updated ?? 0}</td>
                <td className="tabular px-4 py-3 text-text-secondary">{l.vehicles_sold ?? 0}</td>
                <td className="tabular px-4 py-3 text-text-secondary">{l.vehicles_unchanged ?? 0}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-accent">
                  {l.error_message ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
