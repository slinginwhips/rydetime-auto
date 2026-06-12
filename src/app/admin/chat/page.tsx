import Link from "next/link";
import SupabaseNotice from "../_components/SupabaseNotice";
import { safeQuery, formatDateTime } from "../_lib/adminData";
import type { ChatMessage, ChatSession } from "@/types/chat";

export const dynamic = "force-dynamic";

type SessionWithMessages = ChatSession & { chat_messages: ChatMessage[] };

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: selectedId } = await searchParams;

  const sessions = await safeQuery<SessionWithMessages[]>([], async (sb) => {
    const { data, error } = await sb
      .from("chat_sessions")
      .select("*, chat_messages(*)")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as SessionWithMessages[];
  });

  const selected = selectedId
    ? sessions.find((s) => s.id === selectedId)
    : undefined;
  const selectedMessages = selected
    ? [...selected.chat_messages].sort((a, b) =>
        a.created_at < b.created_at ? -1 : 1
      )
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Chat Sessions</h1>
      <p className="mt-1 text-sm text-text-secondary">
        AI concierge transcripts — most recent first.
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Session list */}
        <div className="rounded-lg border border-border-subtle bg-background-card">
          {sessions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-muted">
              No chat sessions yet.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {sessions.map((s) => {
                const msgs = [...s.chat_messages].sort((a, b) =>
                  a.created_at < b.created_at ? -1 : 1
                );
                const last = msgs[msgs.length - 1];
                return (
                  <li key={s.id}>
                    <Link
                      href={`/admin/chat?session=${s.id}`}
                      className={`block px-5 py-3 transition-colors hover:bg-surface ${
                        s.id === selectedId ? "bg-surface" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="tabular text-xs text-text-muted">
                          {formatDateTime(s.updated_at)}
                        </span>
                        <span className="tabular rounded bg-surface px-2 py-0.5 text-[10px] font-bold text-text-secondary">
                          {msgs.length} msg{msgs.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-text-primary">
                        {last
                          ? `${last.role === "user" ? "Customer" : "AI"}: ${last.content}`
                          : "No messages"}
                      </p>
                      {s.vehicle_id && (
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          About a specific vehicle
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Transcript */}
        <div className="rounded-lg border border-border-subtle bg-background-card">
          <div className="border-b border-border-subtle px-5 py-4">
            <h2 className="text-sm font-bold text-text-primary">
              {selected
                ? `Transcript — ${formatDateTime(selected.created_at)}`
                : "Transcript"}
            </h2>
          </div>
          {!selected ? (
            <p className="px-5 py-10 text-center text-sm text-text-muted">
              Select a session to view the full transcript.
            </p>
          ) : (
            <div className="max-h-[36rem] space-y-3 overflow-y-auto p-5">
              {selectedMessages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-accent/15 text-text-primary"
                      : "bg-surface text-text-secondary"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {m.role === "user" ? "Customer" : "AI Assistant"} ·{" "}
                    {formatDateTime(m.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
