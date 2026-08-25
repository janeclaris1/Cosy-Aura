"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

type AuthProviders = Record<string, { id: string; name: string }>;

export function SocialAuthButtons({ callbackUrl = "/account" }: { callbackUrl?: string }) {
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/providers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AuthProviders | null) => {
        if (!cancelled && data) setProviders(data);
      })
      .catch(() => {
        if (!cancelled) setProviders({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const google = Boolean(providers?.google);
  const facebook = Boolean(providers?.facebook);

  if (providers === null) {
    return (
      <p className="text-xs text-wf-gray text-center py-2">Loading sign-in options…</p>
    );
  }

  if (!google && !facebook) return null;

  async function start(provider: "google" | "facebook") {
    setBusy(provider);
    await signIn(provider, { callbackUrl });
  }

  return (
    <div className="space-y-3">
      {google ? (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void start("google")}
          className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 border border-wf-border bg-white text-sm font-medium hover:bg-wf-light transition-colors disabled:opacity-50"
        >
          <GoogleMark />
          {busy === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
      ) : null}
      {facebook ? (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void start("facebook")}
          className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 border border-wf-border bg-white text-sm font-medium hover:bg-wf-light transition-colors disabled:opacity-50"
        >
          <FacebookMark />
          {busy === "facebook" ? "Redirecting…" : "Continue with Facebook"}
        </button>
      ) : null}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-wf-border" />
        </div>
        <p className="relative text-center text-xs uppercase tracking-[0.14em] text-wf-gray bg-[var(--background,#fff)] px-2 w-fit mx-auto">
          <span className="bg-white px-2">or continue with email</span>
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-1.5 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.8 3 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"
      />
    </svg>
  );
}
