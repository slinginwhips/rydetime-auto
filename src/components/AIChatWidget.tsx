"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { CHAT_MODES, type ChatRole, type ChatRequest } from "@/types/chat";
import { AI_DISCLAIMER, DEALERSHIP } from "@/lib/dealership";
import ChatMarkdown from "@/components/ChatMarkdown";

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
  const pathname = usePathname();
  // Vehicle detail pages have the sticky bottom CTA bar on mobile; the floating
  // button must clear it there. Everywhere else it hugs the corner, padded by
  // the iPhone home-indicator safe area so Safari's bottom bar never covers it.
  const onVdp = /^\/inventory\/[^/]+/.test(pathname ?? "");
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showTip, setShowTip] = useState(false); // bubble visible (drives in/out animation)
  const [tipMounted, setTipMounted] = useState(false); // bubble in the DOM (kept during exit anim)
  const [showBadge, setShowBadge] = useState(false); // red "1" reminder until chat is opened
  // Mobile keyboard handling: when the on-screen keyboard opens, the visual
  // viewport shrinks but layout vh does not, hiding the input/send button.
  // We track the keyboard height and lift the panel above it.
  const [kbInset, setKbInset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const introRan = useRef(false); // guards intro against StrictMode double-invoke

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

  // Inviting intro bubble + red "1" badge over the chat button.
  // Bubble: pops up once per session a moment after load, auto-dismisses.
  // Badge: a non-invasive reminder that persists (across page views) until the
  // visitor opens the chat for the first time this session.
  useEffect(() => {
    if (typeof window === "undefined" || introRan.current) return;
    introRan.current = true;
    if (sessionStorage.getItem("rydetime_chat_opened")) return; // already engaged
    setShowBadge(true);

    if (sessionStorage.getItem("rydetime_chat_tip")) return; // bubble already shown
    sessionStorage.setItem("rydetime_chat_tip", "1");
    // Timers intentionally uncleaned: this widget lives for the page lifetime,
    // and a cleanup would let StrictMode's double-invoke cancel the one-shot.
    setTimeout(() => {
      setTipMounted(true);
      setShowTip(true);
    }, 1200);
    setTimeout(() => setShowTip(false), 7200); // begin exit
    setTimeout(() => setTipMounted(false), 7560); // remove after exit anim
  }, []);

  // Opening the chat clears the bubble + badge for the rest of the session.
  useEffect(() => {
    if (!open) return;
    setShowTip(false);
    setShowBadge(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("rydetime_chat_opened", "1");
    }
  }, [open]);

  // Track the on-screen keyboard via the VisualViewport API (mobile only).
  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      if (!mq.matches) {
        setKbInset(0);
        return;
      }
      // Space taken by the keyboard at the bottom of the layout viewport.
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Ignore small fluctuations (browser chrome); a keyboard is ~200px+.
      setKbInset(inset > 120 ? inset : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  // Keep the latest message and the input in view when the keyboard opens.
  useEffect(() => {
    if (kbInset > 0) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [kbInset]);

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
      {/* Floating button + intro bubble */}
      {!open && (
        <div
          className={`fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 ${
            onVdp
              ? "max-md:bottom-20"
              : "max-md:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {/* Intro speech bubble — springs in once per session, auto-dismisses */}
          {tipMounted && (
            <div
              aria-hidden="true"
              className={`pointer-events-none relative max-w-[16rem] rounded-2xl rounded-br-md border border-border-subtle bg-background-card px-3.5 py-2.5 shadow-xl shadow-black/40 ${
                showTip ? "chat-bubble-in" : "chat-bubble-out"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9.5" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2.5" x2="12" y2="9" />
                    <line x1="12" y1="15" x2="12" y2="21.5" />
                    <line x1="2.5" y1="12" x2="9" y2="12" />
                    <line x1="15" y1="12" x2="21.5" y2="12" />
                  </svg>
                </span>
                <p className="text-[13px] leading-snug text-text-primary">
                  <span className="font-semibold">Hi, I&apos;m RydeTime AI 👋</span>
                  <br />
                  Ask me about financing, trade-ins, or any vehicle on the lot.
                </p>
              </div>
              {/* tail pointing down toward the button */}
              <span className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 border-b border-r border-border-subtle bg-background-card" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open AI assistant chat"
            className="relative flex items-center justify-center transition-transform hover:scale-105"
          >
            <Image
              src="/wheel.png"
              alt=""
              width={72}
              height={72}
              className="chat-wheel-spin h-[68px] w-[68px] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
            />
            {/* iPhone-style unread badge — persists until the chat is opened */}
            {showBadge && (
              <span className="chat-badge-pop absolute right-0 top-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-white ring-2 ring-background shadow-md shadow-black/40">
                1
              </span>
            )}
          </button>
        </div>
      )}

      {/* Panel: bottom sheet (mobile) / side panel (desktop) */}
      {open && (
        <div
          style={kbInset > 0 ? { bottom: kbInset, height: `calc(100dvh - ${kbInset}px)` } : undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] max-h-[100dvh] flex-col rounded-t-xl border border-border-subtle bg-background-secondary shadow-2xl shadow-black/60 md:inset-x-auto md:bottom-5 md:right-5 md:h-[600px] md:max-h-[80vh] md:w-[400px] md:rounded-xl"
        >
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
                    className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto whitespace-pre-wrap bg-accent text-white"
                        : "bg-surface text-text-primary"
                    }`}
                  >
                    {m.content ? (
                      m.role === "assistant" ? (
                        <>
                          <ChatMarkdown text={m.content} />
                          {/* The one link that has to work. Never rely on the
                              model emitting clean markdown for it — if the reply
                              mentions the credit application, give the customer
                              a real button. */}
                          {m.content.includes("/credit-application") && (
                            <a
                              href="/credit-application"
                              className="mt-2 inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            >
                              Start your secure credit application
                            </a>
                          )}
                        </>
                      ) : (
                        m.content
                      )
                    ) : (
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
                className="flex-1 rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none md:text-sm"
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
