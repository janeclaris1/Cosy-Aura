import type { Metadata, Viewport } from "next";
import {
  Alice,
  Cormorant_Garamond,
  Inter,
  Petit_Formal_Script,
} from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { SupportChat } from "@/components/support/SupportChat";
import { Preloader } from "@/components/layout/Preloader";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { NewsletterPopup } from "@/components/home/NewsletterPopup";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { CompareTray } from "@/components/perfume/CompareTray";
import { Providers } from "@/components/Providers";
import { buildRootMetadata } from "@/lib/seo-metadata";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo";
import { LOCALE_COOKIE, parseLocaleCookie } from "@/lib/locale-cookie";
import { applyLocaleCookieToMoney } from "@/lib/money-display";

/** Display / heading face - Google Fonts Alice */
const alice = Alice({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const accent = Petit_Formal_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-accent",
  display: "swap",
});

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#03045e",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const cookieStore = await cookies();
  const pathname = headerList.get("x-pathname") || "";
  const isMaintenance = pathname.startsWith("/maintenance");
  const loc = parseLocaleCookie(cookieStore.get(LOCALE_COOKIE)?.value);
  applyLocaleCookieToMoney(loc);
  const orgLd = buildOrganizationJsonLd();
  const siteLd = buildWebSiteJsonLd();

  return (
    <html
      lang={loc?.locale || "en"}
      className={`${alice.variable} ${cormorant.variable} ${inter.variable} ${accent.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )ca_loc=([^;]*)/);if(!m)return;var p=decodeURIComponent(m[1]).split("|");if(p.length<5)return;window.__CA_LOC={language:p[0],currency:p[1],locale:p[2],country:p[3]||null,rate:Number(p[4])};}catch(e){}})();`,
          }}
        />
        <meta name="algolia-site-verification" content="163E676A1222ACC2" />
        <meta
          name="google-site-verification"
          content="_SPtOEkK2AipTYoZRjFj4R4QyFohXr8oq8tsposOpx4"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname||"";if(p.indexOf("/admin")===0||p.indexOf("/maintenance")===0){document.documentElement.classList.add("preload-skip");}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <GoogleAnalytics />
        <MetaPixel />
        <Providers initialLocale={loc}>
          {isMaintenance ? (
            children
          ) : (
            <>
              <Preloader />
              <Header />
              <main className="min-h-screen">{children}</main>
              <Footer />
              <CartDrawer />
              <CompareTray />
              <NewsletterPopup />
              <CookieConsent />
              <SupportChat />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
