"use client";

import { SessionProvider } from "next-auth/react";
import { GeoLocaleSync } from "@/components/locale/GeoLocaleSync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GeoLocaleSync />
      {children}
    </SessionProvider>
  );
}
