"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store";
import { usePremiumStore } from "@/lib/premium-store";
import { readConsent } from "@/lib/cookie-consent";
import type { SupportCartLine } from "@/lib/support-types";

type Turn = { role: "user" | "assistant"; content: string };

const GREETING: Turn = {
  role: "assistant",
  content:
    "Hi there! Welcome to Cosy Aura. I’m Enow - how can I help you today? Looking for a signature oil, or something for a gift? 😊",
};

function renderInline(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      const label = link[1];
      if (href.startsWith("http") || href.startsWith("mailto:")) {
        return (
          <a
            key={i}
            href={href}
            className="underline underline-offset-2 hover:text-gold"
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
          >
            {label}
          </a>
        );
      }
      return (
        <Link key={i} href={href} className="underline underline-offset-2 hover:text-gold">
          {label}
        </Link>
      );
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={i} className="font-medium text-espresso">
          {bold[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MessageBody({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      {content.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {para.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {renderInline(line)}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

export function SupportChat() {
  const pathname = usePathname();
  const addItem = useCartStore((s) => s.addItem);
  const compareCount = usePremiumStore((s) => s.compare.length);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookieBanner, setCookieBanner] = useState(false);
  const [messages, setMessages] = useState<Turn[]>([GREETING]);
  const scroller = useRef<HTMLDivElement>(null);
  const sessionId = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `chat-${Date.now()}`
  );
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const isPdp = Boolean(pathname && /^\/fragrances\/[^/]+$/.test(pathname));

  useEffect(() => {
    function syncCookieBanner() {
      if (pathname?.startsWith("/admin")) {
        setCookieBanner(false);
        return;
      }
      setCookieBanner(!readConsent());
    }
    syncCookieBanner();
    window.addEventListener("cookie-consent-updated", syncCookieBanner);
    return () => window.removeEventListener("cookie-consent-updated", syncCookieBanner);
  }, [pathname]);

  const fabBottom = cookieBanner
    ? "bottom-[13rem] sm:bottom-44"
    : compareCount > 0
      ? "bottom-24"
      : isPdp
        ? "bottom-24"
        : "bottom-5";

  function flushSummary() {
    const turns = messagesRef.current.filter((m) => m !== GREETING && m.content.trim());
    if (!turns.some((m) => m.role === "user")) return;
    const payload = JSON.stringify({
      sessionId: sessionId.current,
      messages: turns,
    });
    const url = "/api/support-chat/summary";
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSummary();
    };
    window.addEventListener("pagehide", flushSummary);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushSummary);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, open, loading]);

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/maintenance")
  ) {
    return null;
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Turn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => m !== GREETING),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reply");
      const lines = (data.cartLines || []) as SupportCartLine[];
      for (const line of lines) {
        for (let n = 0; n < (line.quantity || 1); n += 1) {
          addItem({
            fragranceId: line.fragranceId,
            slug: line.slug,
            brand: line.brand,
            model: line.model,
            price: line.price,
            image: line.image,
            bottleSize: line.bottleSize,
          });
        }
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reply");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed right-4 z-[90] flex flex-col items-end gap-3 transition-[bottom] duration-200",
        "pb-[env(safe-area-inset-bottom)]",
        fabBottom
      )}
    >
      {open && (
        <div className="w-[min(100vw-2rem,22rem)] h-[min(70vh,32rem)] bg-ivory border border-wf-border shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-espresso text-ivory px-4 py-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-playfair text-lg leading-tight">Enow</p>
              <p className="text-[11px] uppercase tracking-[0.12em] text-ivory/70 mt-0.5">
                Cosy Aura support
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                flushSummary();
                setOpen(false);
              }}
              className="p-1 hover:text-gold transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[#F9F9F9]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[90%] text-sm leading-relaxed px-3 py-2",
                  m.role === "user"
                    ? "ml-auto bg-espresso text-ivory"
                    : "bg-white border border-wf-border text-espresso"
                )}
              >
                {m.role === "assistant" ? (
                  <MessageBody content={m.content} />
                ) : (
                  m.content
                )}
              </div>
            ))}
            {loading && (
              <p className="text-xs text-mocha px-1">Thinking…</p>
            )}
            {error && (
              <p className="text-xs text-[#c8102e] px-1">
                {error}{" "}
                <Link href="/contact" className="underline">
                  Contact us
                </Link>
              </p>
            )}
          </div>

          <form
            className="border-t border-wf-border bg-ivory p-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hi Enow - I’m looking for…"
              className="flex-1 min-w-0 bg-white border border-wf-border px-3 py-2 text-sm outline-none focus:border-espresso"
              maxLength={1200}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 shrink-0 bg-espresso text-ivory flex items-center justify-center hover:bg-espresso/90 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          setOpen((v) => {
            if (v) flushSummary();
            return !v;
          })
        }
        className="w-14 h-14 rounded-full bg-espresso text-ivory shadow-lg flex items-center justify-center hover:bg-espresso/90 transition-colors"
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
