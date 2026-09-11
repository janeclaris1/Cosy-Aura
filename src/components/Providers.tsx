"use client";

import { SessionProvider } from "next-auth/react";
import { GeoLocaleSync } from "@/components/locale/GeoLocaleSync";
import { LocaleProvider } from "@/components/locale/LocaleProvider";
import { NavigationProgressProvider } from "@/components/layout/NavigationProgress";
import type { LocaleCookie } from "@/lib/locale-cookie";

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: LocaleCookie | null;
}) {
  return (
    <SessionProvider>
      <LocaleProvider initialLocale={initialLocale}>
        <NavigationProgressProvider>
          <GeoLocaleSync />
          {children}
        </NavigationProgressProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
