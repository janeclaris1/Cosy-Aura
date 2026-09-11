"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { SupportChat } from "@/components/support/SupportChat";
import { Preloader } from "@/components/layout/Preloader";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { NewsletterPopup } from "@/components/home/NewsletterPopup";
import { CompareTray } from "@/components/perfume/CompareTray";
import { PwaProvider } from "@/components/pwa/PwaProvider";

function isBareRoute(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/maintenance");
}

/** Storefront chrome — pathname-aware so admin → shop navigation restores header/footer. */
export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  if (isBareRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Preloader />
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CartDrawer />
      <CompareTray />
      <NewsletterPopup />
      <CookieConsent />
      <PwaProvider />
      <SupportChat />
    </>
  );
}
