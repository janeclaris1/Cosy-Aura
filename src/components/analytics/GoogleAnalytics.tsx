"use client";

import Script from "next/script";
import { useEffect } from "react";
import { readConsent } from "@/lib/cookie-consent";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-SNL8Y1TBSQ";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function applyAnalyticsConsent(analytics: boolean) {
  window.gtag?.("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
  });
}

export function GoogleAnalytics() {
  useEffect(() => {
    const syncConsent = () => {
      const existing = readConsent();
      applyAnalyticsConsent(existing?.prefs.analytics ?? false);
    };

    syncConsent();

    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ prefs?: { analytics?: boolean } }>).detail;
      applyAnalyticsConsent(detail?.prefs?.analytics ?? false);
    };

    window.addEventListener("cookie-consent-updated", onUpdate);
    return () => window.removeEventListener("cookie-consent-updated", onUpdate);
  }, []);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
            });
            gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
          `,
        }}
      />
    </>
  );
}
