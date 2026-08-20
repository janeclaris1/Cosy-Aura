"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  readConsent,
  type CookiePrefs,
  type ConsentRecord,
} from "@/lib/cookie-consent";
import { useT } from "@/lib/locale-store";

const STORAGE_KEY = COOKIE_CONSENT_STORAGE_KEY;

const DEFAULT_PREFS: CookiePrefs = {
  essential: true,
  analytics: false,
  marketing: false,
  personalization: false,
};

function saveConsent(choice: ConsentRecord["choice"], prefs: CookiePrefs) {
  const record: ConsentRecord = {
    choice,
    prefs: { ...prefs, essential: true },
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent("cookie-consent-updated", { detail: record }));
}

export function CookieConsent() {
  const t = useT();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      setVisible(false);
      return;
    }
    const existing = readConsent();
    setVisible(!existing);
    if (existing?.prefs) setPrefs(existing.prefs);
  }, [pathname]);

  if (!visible) return null;

  const dismiss = (choice: ConsentRecord["choice"], nextPrefs: CookiePrefs) => {
    saveConsent(choice, nextPrefs);
    setVisible(false);
    setShowPrefs(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-5 pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div className="pointer-events-auto mx-auto max-w-6xl bg-white border border-wf-border shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 p-5 md:p-7">
          <div className="flex-1 space-y-3 text-[13px] leading-relaxed text-wf-black">
            <p>{t("cookie.message")}</p>
            <p>
              Learn more about how we handle personal information in our{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-gold">
                Privacy Policy
              </Link>
              .
            </p>

            {showPrefs && (
              <div className="mt-4 space-y-3 border-t border-wf-border pt-4">
                <PreferenceRow
                  label="Essential"
                  description="Required for cart, checkout, security, and core site features. Always on."
                  checked
                  disabled
                />
                <PreferenceRow
                  label="Analytics"
                  description="Helps us understand how visitors use the store so we can improve it."
                  checked={prefs.analytics}
                  onChange={(checked) => setPrefs((p) => ({ ...p, analytics: checked }))}
                />
                <PreferenceRow
                  label="Personalisation"
                  description="Remembers preferences and suggests fragrances that may interest you."
                  checked={prefs.personalization}
                  onChange={(checked) =>
                    setPrefs((p) => ({ ...p, personalization: checked }))
                  }
                />
                <PreferenceRow
                  label="Marketing"
                  description="Supports advertising and social features across partner platforms."
                  checked={prefs.marketing}
                  onChange={(checked) => setPrefs((p) => ({ ...p, marketing: checked }))}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 w-full lg:w-[220px] shrink-0">
            {!showPrefs ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    dismiss("accepted", {
                      essential: true,
                      analytics: true,
                      marketing: true,
                      personalization: true,
                    })
                  }
                  className="w-full rounded-full bg-wf-black text-white text-sm font-medium py-2.5 px-5 hover:bg-black transition-colors"
                >
                  {t("cookie.accept")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrefs(true)}
                  className="w-full rounded-full border border-wf-black text-wf-black text-sm font-medium py-2.5 px-5 hover:bg-wf-light transition-colors"
                >
                  Set Cookie Preferences
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => dismiss("custom", prefs)}
                  className="w-full rounded-full bg-wf-black text-white text-sm font-medium py-2.5 px-5 hover:bg-black transition-colors"
                >
                  {t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrefs(false)}
                  className="w-full rounded-full border border-wf-black text-wf-black text-sm font-medium py-2.5 px-5 hover:bg-wf-light transition-colors"
                >
                  {t("common.cancel")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="mt-1 accent-wf-black"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>
        <span className="block font-medium text-sm">{label}</span>
        <span className="block text-wf-gray text-[12px] leading-snug">{description}</span>
      </span>
    </label>
  );
}
