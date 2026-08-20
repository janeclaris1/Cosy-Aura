"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { X } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { MEMBER_DISCOUNT_PERCENT } from "@/lib/pricing";

const STORAGE_KEY = "ca-newsletter-popup-dismissed";
const SHOW_DELAY_MS = 3500;

const SHOWCASE = [
  {
    src: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=600&fit=crop",
    alt: "Chanel",
    className: "left-6 top-10 w-[42%] rotate-[-8deg]",
  },
  {
    src: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&h=600&fit=crop",
    alt: "Dior",
    className: "right-5 top-1/2 -translate-y-1/2 w-[48%] rotate-[6deg] z-10",
  },
  {
    src: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600&h=600&fit=crop",
    alt: "Tom Ford",
    className: "bottom-8 left-1/4 w-[40%] rotate-[-3deg]",
  },
];

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // ignore
    }

    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email,
          phone,
          password,
          subscribeNewsletter: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account");
        setStatus("error");
        return;
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created — please sign in to unlock your discount.");
        setStatus("error");
        return;
      }

      setStatus("success");
      window.setTimeout(dismiss, 1600);
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-popup-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-wf-black/55 backdrop-blur-[2px]"
        aria-label="Close newsletter popup"
        onClick={dismiss}
      />

      <div className="relative w-full max-w-[860px] overflow-hidden bg-white shadow-2xl animate-fade-up grid grid-cols-1 md:grid-cols-2">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/95 border border-wf-border flex items-center justify-center text-wf-black hover:bg-wf-light transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 flex flex-col justify-center px-8 py-10 md:px-10 md:py-12">
          <BrandLogo size="sm" className="mb-7" />

          <p className="text-[11px] tracking-[0.28em] uppercase text-gold mb-3">
            Member offer
          </p>
          <h2
            id="newsletter-popup-title"
            className="font-playfair text-3xl md:text-[2.35rem] leading-tight text-wf-black mb-3"
          >
            Create your account
          </h2>
          <p className="font-playfair text-base text-wf-black/80 mb-7 max-w-sm">
            Join the Cosy Aura list and unlock a permanent {MEMBER_DISCOUNT_PERCENT}%
            member discount on every order when you shop signed in.
          </p>

          {status === "success" ? (
            <p className="text-sm text-green-700 font-medium">
              You&apos;re in — your {MEMBER_DISCOUNT_PERCENT}% member discount is active.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-wf-border bg-white text-sm text-wf-black placeholder:text-wf-gray/70 focus:outline-none focus:border-gold"
              />
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-wf-border bg-white text-sm text-wf-black placeholder:text-wf-gray/70 focus:outline-none focus:border-gold"
              />
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                required
                placeholder="Phone / WhatsApp (e.g. +233…)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-wf-border bg-white text-sm text-wf-black placeholder:text-wf-gray/70 focus:outline-none focus:border-gold"
              />
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Create password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-wf-border bg-white text-sm text-wf-black placeholder:text-wf-gray/70 focus:outline-none focus:border-gold"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-wf-black text-white text-xs tracking-[0.22em] uppercase py-3.5 hover:bg-gold transition-colors disabled:opacity-60"
              >
                {status === "loading"
                  ? "Creating account..."
                  : `Join & unlock ${MEMBER_DISCOUNT_PERCENT}% off`}
              </button>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <p className="text-[11px] text-wf-gray leading-relaxed pt-1">
                Creating an account also adds you to our email list. Unsubscribe anytime.{" "}
                Already a member?{" "}
                <Link href="/account/login" className="text-gold hover:underline" onClick={dismiss}>
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>

        <div className="relative hidden md:block min-h-[420px] bg-[#141414] overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(184,134,11,0.9) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gold/20" />

          {SHOWCASE.map((item) => (
            <div
              key={item.src}
              className={`absolute aspect-square bg-white/95 shadow-xl overflow-hidden ${item.className}`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-contain p-2"
                sizes="200px"
                unoptimized
              />
            </div>
          ))}

          <div className="absolute bottom-5 left-0 right-0 text-center">
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/70">
              Permanent {MEMBER_DISCOUNT_PERCENT}% member pricing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
