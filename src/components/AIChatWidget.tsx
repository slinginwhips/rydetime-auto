"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CHAT_MODES, type ChatRole, type ChatRequest } from "@/types/chat";
import { AI_DISCLAIMER, DEALERSHIP } from "@/lib/dealership";

interface UiMessage {
  role: ChatRole;
  content: string;
}

function getSessionToken(): string {
  let token = sessionStorage.getItem("rydetime_chat_token");
  if (!token) {
    token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("rydetime_chat_token", token);
  }
  return token;
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open via window event (Ask AI buttons site-wide)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ vehicleId?: string }>).detail;
      if (detail?.vehicleId) setVehicleId(detail.vehicleId);
      setOpen(true);
    };
    window.addEventListener("rydetime:open-chat", handler);
    return () => window.removeEventListener("rydetime:open-chat", handler);
  }, []);

  // Autoscroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, 500);
      if (!trimmed || streaming) return;
      const history: UiMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);
      try {
        const body: ChatRequest = {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          session_token: getSessionToken(),
          vehicle_id: vehicleId,
        };
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          // AI not configured — show the message field
          const data = await res.json();
          const msg =
            data.message ||
            `Our AI assistant isn't available right now. Call us at ${DEALERSHIP.phone} and we'll help directly.`;
          setMessages([...history, { role: "assistant", content: msg }]);
          return;
        }
        if (!res.ok || !res.body) throw new Error("Chat request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const current = acc;
          setMessages([...history, { role: "assistant", content: current }]);
        }
      } catch {
        setMessages([
          ...history,
          {
            role: "assistant",
            content: `Sorry — something went wrong on my end. You can try again, or call the dealership at ${DEALERSHIP.phone}.`,
          },
        ]);
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, vehicleId]
  );

  const visibleModes = CHAT_MODES.filter((m) => !m.vdpOnly || !!vehicleId);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant chat"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-black/50 transition-all hover:scale-105 hover:bg-accent-hover max-md:bottom-20"
        >
          {/* Wheel icon */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2.5" x2="12" y2="9" />
            <line x1="12" y1="15" x2="12" y2="21.5" />
            <line x1="2.5" y1="12" x2="9" y2="12" />
            <line x1="15" y1="12" x2="21.5" y2="12" />
          </svg>
        </button>
      )}

      {/* Panel: bottom sheet (mobile) / side panel (desktop) */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col rounded-t-xl border border-border-subtle bg-background-secondary shadow-2xl shadow-black/60 md:inset-x-auto md:bottom-5 md:right-5 md:h-[600px] md:max-h-[80vh] md:w-[400px] md:rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9.5" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="2.5" x2="12" y2="9" />
                  <line x1="12" y1="15" x2="12" y2="21.5" />
                  <line x1="2.5" y1="12" x2="9" y2="12" />
                  <line x1="15" y1="12" x2="21.5" y2="12" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">RydeTime Assistant</p>
                <p className="text-[11px] text-text-muted">AI-powered · no pressure</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div>
                <p className="text-sm leading-relaxed text-text-secondary">
                  Hi — I&apos;m the RydeTime Auto assistant. I can help you find a vehicle,
                  estimate payments, set up a test drive, or answer questions about anything on
                  the lot. What can I do for you?
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleModes.map((m) => (
                    <button
                      key={m.mode}
                      type="button"
                      onClick={() => send(m.starter)}
                      className="rounded-full border border-border-subtle bg-background-card px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent"
                    >
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-accent text-white"
                        : "bg-surface text-text-primary"
                    }`}
                  >
                    {m.content || (
                      <span className="inline-flex gap-1" aria-label="Assistant is typing">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            className="border-t border-border-subtle p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                maxLength={500}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about our vehicles…"
                aria-label="Chat message"
                className="flex-1 rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-text-muted">{AI_DISCLAIMER}</p>
          </form>
        </div>
      )}
    </>
  );
}
