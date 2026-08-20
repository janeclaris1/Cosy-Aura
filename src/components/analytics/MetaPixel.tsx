"use client";

import Script from "next/script";
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { readConsent } from "@/lib/cookie-consent";
import { META_PIXEL_ID, trackMetaPageView } from "@/lib/meta-pixel";

function marketingAllowed() {
  const consent = readConsent();
  if (!consent) return false;
  return consent.prefs.marketing || consent.choice === "accepted";
}

function MetaPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const booted = useRef(false);

  useEffect(() => {
    const sync = () => {
      if (!window.fbq || !META_PIXEL_ID) return;
      if (marketingAllowed()) {
        try {
          window.fbq("consent", "grant");
        } catch {
          /* older pixels may ignore */
        }
        trackMetaPageView();
      } else {
        try {
          window.fbq("consent", "revoke");
        } catch {
          /* ignore */
        }
      }
    };
    sync();
    window.addEventListener("cookie-consent-updated", sync);
    return () => window.removeEventListener("cookie-consent-updated", sync);
  }, []);

  useEffect(() => {
    if (!META_PIXEL_ID || !marketingAllowed()) return;
    if (!booted.current) {
      booted.current = true;
      return;
    }
    trackMetaPageView();
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel() {
  if (!META_PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('consent', 'revoke');
          fbq('init', '${META_PIXEL_ID}');
        `}
      </Script>
      <Suspense fallback={null}>
        <MetaPixelTracker />
      </Suspense>
    </>
  );
}
