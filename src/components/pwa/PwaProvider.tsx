"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "lucide-react";
import { useT } from "@/lib/locale-store";

const DISMISS_KEY = "ca_pwa_install_dismissed";
export const PWA_INSTALL_EVENT = "ca-pwa-install";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function canOfferPwaInstall(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone()) return false;
  return Boolean(deferredPrompt) || isIos();
}

export function requestPwaInstall() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PWA_INSTALL_EVENT));
}

export function PwaProvider() {
  const t = useT();
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_PWA_DEV) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration errors in unsupported contexts */
    });
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/maintenance")) {
      setShow(false);
      return;
    }
    if (isStandalone()) {
      setShow(false);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      deferredPrompt = ev;
      setDeferred(ev);
      setIosHint(false);
      if (localStorage.getItem(DISMISS_KEY) !== "1") {
        setShow(true);
      }
    };

    const onRequest = () => {
      if (isStandalone()) return;
      if (deferredPrompt) {
        setDeferred(deferredPrompt);
        setIosHint(false);
        setShow(true);
        return;
      }
      if (isIos()) {
        setIosHint(true);
        setShow(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener(PWA_INSTALL_EVENT, onRequest);

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIos() && localStorage.getItem(DISMISS_KEY) !== "1") {
      iosTimer = setTimeout(() => {
        if (localStorage.getItem(DISMISS_KEY) === "1" || isStandalone()) return;
        setIosHint(true);
        setShow(true);
      }, 8000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener(PWA_INSTALL_EVENT, onRequest);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [pathname]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    const promptEvent = deferred || deferredPrompt;
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    deferredPrompt = null;
    setDeferred(null);
    setShow(false);
    if (outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[95] p-3 md:p-4 pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label={t("pwa.installTitle")}
    >
      <div className="pointer-events-auto mx-auto max-w-lg border border-wf-border bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.1)]">
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center bg-[#03045e] text-white">
            <Download className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-espresso text-sm">{t("pwa.installTitle")}</p>
            <p className="mt-1 text-xs text-mocha leading-relaxed">
              {iosHint ? t("pwa.iosHint") : t("pwa.installBody")}
            </p>
            {iosHint ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-espresso">
                <Share className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("pwa.iosSteps")}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {!iosHint && (deferred || deferredPrompt) ? (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="btn-primary text-xs px-4 py-2"
                >
                  {t("pwa.install")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-mocha underline underline-offset-2 px-2 py-2"
              >
                {t("pwa.dismiss")}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 p-1 text-mocha hover:text-espresso"
            aria-label={t("pwa.dismiss")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
