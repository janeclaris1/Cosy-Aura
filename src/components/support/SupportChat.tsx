"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store";
import { usePremiumStore } from "@/lib/premium-store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { readConsent } from "@/lib/cookie-consent";
import type { SupportCartLine, SupportCartRemoval } from "@/lib/support-types";
import {
  classifyContactGateIntent,
  contactGateReplyKey,
} from "@/lib/support-contact-gate";

type Turn = { role: "user" | "assistant"; content: string };

const ENOW_AVATAR = "/images/support/enow-avatar.png";

function EnowAvatar({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-full bg-white/10",
        className
      )}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <Image
        src={ENOW_AVATAR}
        alt="Enow"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        priority
      />
    </span>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeWhatsApp(raw: string): string {
  return String(raw || "").replace(/[^\d+]/g, "");
}

function isValidWhatsApp(raw: string): boolean {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function firstNameFromEmail(email: string): string | null {
  const local = email.split("@")[0] || "";
  const token = local.split(/[._+-]/)[0]?.replace(/\d+/g, "") || "";
  if (token.length < 2) return null;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

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
  const removeItem = useCartStore((s) => s.removeItem);
  const cartItems = useCartStore((s) => s.items);
  const compareCount = usePremiumStore((s) => s.compare.length);
  const country = useLocaleStore((s) => s.country);
  const currency = useLocaleStore((s) => s.currency);
  const language = useLocaleStore((s) => s.language);
  const t = useT();
  const greeting: Turn = {
    role: "assistant",
    content: `${t("support.greeting")} 😊`,
  };
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookieBanner, setCookieBanner] = useState(false);
  const [messages, setMessages] = useState<Turn[]>([]);
  const [contactPrompted, setContactPrompted] = useState(false);
  const [contactCollected, setContactCollected] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const [contact, setContact] = useState<{ email: string; whatsapp: string } | null>(
    null
  );
  const scroller = useRef<HTMLDivElement>(null);
  const sessionId = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `chat-${Date.now()}`
  );
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const contactRef = useRef(contact);
  contactRef.current = contact;

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) return [greeting];
      if (prev.length === 1 && prev[0].role === "assistant") return [greeting];
      return prev;
    });
  }, [greeting.content]);

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
    const turns = messagesRef.current.filter(
      (m, i) => !(i === 0 && m.role === "assistant") && m.content.trim()
    );
    if (!turns.some((m) => m.role === "user")) return;
    const payload = JSON.stringify({
      sessionId: sessionId.current,
      messages: turns,
      contact: contactRef.current,
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
  }, [messages, open, loading, contactPrompted, contactCollected]);

  async function askAssistant(history: Turn[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.filter((m, i) => !(i === 0 && m.role === "assistant")),
          language,
          country,
          currency,
          contact: contactRef.current,
          cart: cartItems.map((item) => ({
            fragranceId: item.fragranceId,
            slug: item.slug,
            brand: item.brand,
            model: item.model,
            bottleSize: item.bottleSize,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reply");
      const removals = (data.cartRemovals || []) as SupportCartRemoval[];
      for (const removal of removals) {
        removeItem(removal.fragranceId, removal.bottleSize);
      }
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
      setMessages([...history, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reply");
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    // First reply after greeting → show contact form (no AI yet).
    if (!contactPrompted) {
      const next: Turn[] = [...messages, { role: "user", content: text }];
      setMessages([
        ...next,
        { role: "assistant", content: `${t("support.askContact")} 😊` },
      ]);
      setInput("");
      setContactPrompted(true);
      setContactError(null);
      return;
    }

    // Enforce form completion before normal chat continues —
    // reply intelligently to privacy / “why” objections instead of one canned line.
    if (!contactCollected) {
      const replyKey = contactGateReplyKey(classifyContactGateIntent(text));
      const next: Turn[] = [
        ...messages,
        { role: "user", content: text },
        { role: "assistant", content: t(replyKey) },
      ];
      setMessages(next);
      setInput("");
      return;
    }

    const next: Turn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    await askAssistant(next);
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    if (loading || contactCollected) return;

    const email = contactEmail.trim().toLowerCase();
    const whatsapp = normalizeWhatsApp(contactWhatsapp.trim());
    if (!EMAIL_RE.test(email) || !isValidWhatsApp(whatsapp)) {
      setContactError(t("support.contactInvalid"));
      return;
    }

    setContactError(null);
    const saved = { email, whatsapp };
    setContact(saved);
    contactRef.current = saved;
    setContactCollected(true);

    const name = firstNameFromEmail(email);
    const thanksLine = t("support.contactThanks", {
      name: name ? `, ${name}` : "",
    });

    const contactLine = `Email: ${email}\nWhatsApp: ${whatsapp}`;
    const next: Turn[] = [
      ...messages,
      { role: "user", content: contactLine },
      { role: "assistant", content: thanksLine },
    ];
    setMessages(next);
    await askAssistant(next);
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/maintenance")) {
    return null;
  }

  const chatLocked = contactPrompted && !contactCollected;

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
            <div className="flex items-center gap-3 min-w-0">
              <EnowAvatar size={44} className="ring-2 ring-[#FFD200]/80" />
              <div className="min-w-0">
                <p className="font-playfair text-lg leading-tight">Enow</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-ivory/70 mt-0.5">
                  {t("support.subtitle")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                flushSummary();
                setOpen(false);
              }}
              className="p-1 hover:text-gold transition-colors"
              aria-label={t("support.close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[#F9F9F9]">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2 max-w-[95%] items-start",
                  m.role === "user" ? "ml-auto justify-end" : "justify-start"
                )}
              >
                {m.role === "assistant" ? (
                  <EnowAvatar size={28} className="mt-0.5 ring-1 ring-wf-border" />
                ) : null}
                <div
                  className={cn(
                    "max-w-[90%] text-sm leading-relaxed px-3 py-2",
                    m.role === "user"
                      ? "bg-espresso text-ivory"
                      : "bg-white border border-wf-border text-espresso"
                  )}
                >
                  {m.role === "assistant" ? (
                    <MessageBody content={m.content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}

            {chatLocked && (
              <form
                onSubmit={(e) => void submitContact(e)}
                className="max-w-[95%] bg-white border border-wf-border p-3 space-y-2.5 shadow-sm"
              >
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-mocha mb-1">
                    {t("support.contactEmail")}
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-[#F9F9F9] border border-wf-border px-3 py-2 text-sm text-espresso outline-none focus:border-espresso"
                    placeholder="you@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-mocha mb-1">
                    {t("support.contactWhatsapp")}
                  </label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    className="w-full bg-[#F9F9F9] border border-wf-border px-3 py-2 text-sm text-espresso outline-none focus:border-espresso"
                    placeholder={t("support.contactWhatsappHint")}
                    required
                  />
                </div>
                {contactError && (
                  <p className="text-xs text-[#c8102e]">{contactError}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#03045e] text-white text-sm font-medium py-2.5 hover:bg-[#02033f] disabled:opacity-50 transition-colors"
                >
                  {t("support.contactContinue")}
                </button>
              </form>
            )}

            {loading && (
              <div className="flex items-center gap-2 px-1">
                <EnowAvatar size={24} className="ring-1 ring-wf-border opacity-80" />
                <p className="text-xs text-mocha">{t("support.thinking")}</p>
              </div>
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
              placeholder={
                chatLocked ? t("support.placeholderLocked") : t("support.placeholder")
              }
              className="flex-1 min-w-0 bg-white border border-wf-border px-3 py-2 text-sm outline-none focus:border-espresso disabled:bg-[#F9F9F9] disabled:text-mocha"
              maxLength={1200}
              disabled={loading}
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

      <div className="flex flex-col items-end gap-2.5">
        {!open && (
          <div className="motion-safe:animate-chat-teaser-float motion-reduce:animate-none">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative rounded-full bg-white px-4 py-2.5 text-left shadow-[0_4px_14px_rgba(3,4,94,0.12)] hover:shadow-[0_6px_18px_rgba(3,4,94,0.16)] transition-shadow animate-chat-teaser-in motion-reduce:animate-none"
            >
              <span className="block whitespace-nowrap font-roboto text-sm font-medium text-[#03045e] leading-snug">
                {t("support.teaser")}
              </span>
              {/* Tail pointing down toward the chat icon */}
              <span
                className="pointer-events-none absolute right-6 -bottom-1.5 h-3 w-3 rotate-45 bg-white shadow-[2px_2px_4px_rgba(3,4,94,0.06)]"
                aria-hidden
              />
            </button>
          </div>
        )}

        <div
          className={cn(
            !open && "motion-safe:animate-chat-fab-pulse motion-reduce:animate-none"
          )}
        >
          <button
            type="button"
            onClick={() =>
              setOpen((v) => {
                if (v) flushSummary();
                return !v;
              })
            }
            className={cn(
              "w-14 h-14 shrink-0 rounded-full bg-[#FFD200] text-[#03045e] shadow-lg flex items-center justify-center hover:bg-[#E6BC00] transition-transform duration-200 hover:scale-105 active:scale-95",
              !open && "animate-chat-fab-in motion-reduce:animate-none"
            )}
            aria-label={open ? t("support.close") : t("support.open")}
          >
            {open ? (
              <X className="w-6 h-6 transition-transform duration-200" />
            ) : (
              <MessageCircle className="w-6 h-6 transition-transform duration-200" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
