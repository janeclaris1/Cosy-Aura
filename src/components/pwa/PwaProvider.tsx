"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "lucide-react";
import { useT } from "@/lib/locale-store";
import { readConsent } from "@/lib/cookie-consent";

const DISMISS_KEY = "ca_pwa_install_dismissed";
export const PWA_INSTALL_EVENT = "ca-pwa-install";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent;
  // Chrome/Firefox/Edge on iOS include CriOS/FxiOS/EdgiOS; Safari does not
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//i.test(ua)) return false;
  // Instagram / Facebook / other in-app browsers
  if (/FBAN|FBAV|Instagram|Line\//i.test(ua)) return false;
  return /Safari/i.test(ua) || !/(Chrome|Android)/i.test(ua);
}

export function canOfferPwaInstall(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandaloneDisplay()) return false;
  return Boolean(deferredPrompt) || isIosDevice();
}

/** Opens the native share sheet (iOS: includes “Add to Home Screen”). Must run from a tap. */
export async function sharePageForInstall(): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  try {
    await navigator.share({
      title: "COSY AURA",
      text: "Cosy Aura — oil-based perfume oils",
      url: window.location.origin + "/",
    });
    return true;
  } catch {
    // User cancelled or share failed
    return false;
  }
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
  const [sharing, setSharing] = useState(false);
  const [iosNeedsSafari, setIosNeedsSafari] = useState(false);

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
    if (isStandaloneDisplay()) {
      setShow(false);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      deferredPrompt = ev;
      setDeferred(ev);
      setIosHint(false);
      if (localStorage.getItem(DISMISS_KEY) !== "1" && readConsent()) {
        setShow(true);
      }
    };

    const onRequest = () => {
      if (isStandaloneDisplay()) return;
      if (deferredPrompt) {
        setDeferred(deferredPrompt);
        setIosHint(false);
        setShow(true);
        return;
      }
      if (isIosDevice()) {
        setIosNeedsSafari(!isIosSafari());
        setIosHint(true);
        setShow(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener(PWA_INSTALL_EVENT, onRequest);

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIosDevice() && localStorage.getItem(DISMISS_KEY) !== "1") {
      iosTimer = setTimeout(() => {
        if (localStorage.getItem(DISMISS_KEY) === "1" || isStandaloneDisplay()) return;
        // Wait until cookie banner is gone so our CTA is tappable
        if (!readConsent()) return;
        setIosNeedsSafari(!isIosSafari());
        setIosHint(true);
        setShow(true);
      }, 10000);
    }

    const onCookie = () => {
      if (
        isIosDevice() &&
        localStorage.getItem(DISMISS_KEY) !== "1" &&
        !isStandaloneDisplay() &&
        readConsent()
      ) {
        setTimeout(() => {
          if (localStorage.getItem(DISMISS_KEY) === "1") return;
          setIosNeedsSafari(!isIosSafari());
          setIosHint(true);
          setShow(true);
        }, 1500);
      }
    };
    window.addEventListener("cookie-consent-updated", onCookie);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener(PWA_INSTALL_EVENT, onRequest);
      window.removeEventListener("cookie-consent-updated", onCookie);
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

  async function shareOnIos() {
    setSharing(true);
    const shared = await sharePageForInstall();
    setSharing(false);
    if (shared) {
      // Don’t force-dismiss — user may cancel share sheet without installing
    }
  }

  if (!show) return null;

  const body = iosHint
    ? iosNeedsSafari
      ? t("pwa.iosUseSafari")
      : t("pwa.iosSteps")
    : t("pwa.installBody");

  // Compact toast above support chat; below cookie banner (z-100)
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[96] flex justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none"
      role="dialog"
      aria-label={t("pwa.installTitle")}
    >
      <div className="pointer-events-auto w-full max-w-[22rem] rounded-md border border-wf-border/80 bg-white/95 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 bg-[#03045e]" aria-hidden />
          <div className="flex-1 min-w-0 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#03045e] text-white">
                {iosHint ? (
                  <Share className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-espresso text-[13px] leading-tight">
                  {t("pwa.installTitle")}
                </p>
                <p className="mt-0.5 text-[11px] text-mocha leading-snug line-clamp-2">
                  {body}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="shrink-0 -mr-1 -mt-0.5 p-1.5 text-mocha hover:text-espresso"
                aria-label={t("pwa.dismiss")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-2 pl-9">
              {iosHint &&
              !iosNeedsSafari &&
              typeof navigator !== "undefined" &&
              typeof navigator.share === "function" ? (
                <button
                  type="button"
                  onClick={() => void shareOnIos()}
                  disabled={sharing}
                  className="inline-flex items-center gap-1.5 bg-[#03045e] text-white text-[11px] font-medium px-3 py-1.5 rounded-sm hover:bg-[#03045e]/90 disabled:opacity-60"
                >
                  <Share className="h-3 w-3" aria-hidden />
                  {sharing ? t("pwa.sharing") : t("pwa.shareToInstall")}
                </button>
              ) : null}
              {!iosHint && (deferred || deferredPrompt) ? (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="inline-flex items-center bg-[#03045e] text-white text-[11px] font-medium px-3 py-1.5 rounded-sm hover:bg-[#03045e]/90"
                >
                  {t("pwa.install")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismiss}
                className="text-[11px] text-mocha hover:text-espresso px-1 py-1.5"
              >
                {t("pwa.dismiss")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
