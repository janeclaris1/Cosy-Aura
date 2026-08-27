"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Instagram, Facebook, Twitter, Youtube } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { FooterRegions } from "@/components/layout/FooterRegions";
import { InstallAppLink } from "@/components/pwa/InstallAppLink";
import { useT } from "@/lib/locale-store";
import type { StorePin } from "@/components/layout/StoreLocationsMap";

const StoreLocationsMap = dynamic(
  () =>
    import("@/components/layout/StoreLocationsMap").then(
      (m) => m.StoreLocationsMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 sm:h-80 lg:h-96 rounded-sm border border-white/15 bg-[#02033f] animate-pulse" />
    ),
  }
);

const SHOP_LINKS = [
  { key: "footer.allFragrances", href: "/fragrances" },
  { key: "footer.finder", href: "/fragrance-finder" },
  { key: "footer.atelier", href: "/atelier" },
  { key: "footer.giftFinder", href: "/gift-finder" },
  { key: "footer.subscribe", href: "/subscribe" },
  { key: "footer.collections", href: "/collections" },
  { key: "Chanel", href: "/fragrances/chanel" },
  { key: "Dior", href: "/fragrances/dior" },
];

const SUPPORT_LINKS = [
  { key: "footer.track", href: "/track" },
  { key: "footer.faq", href: "/faq" },
  { key: "footer.shipping", href: "/shipping" },
  { key: "footer.returns", href: "/returns" },
  { key: "footer.privacy", href: "/privacy" },
  { key: "footer.terms", href: "/terms" },
  { key: "footer.contact", href: "/contact" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
      "https://www.instagram.com/cosyaura",
    Icon: Instagram,
  },
  {
    label: "Facebook",
    href:
      process.env.NEXT_PUBLIC_FACEBOOK_URL ||
      "https://www.facebook.com/cosyaura",
    Icon: Facebook,
  },
  {
    label: "X",
    href: process.env.NEXT_PUBLIC_TWITTER_URL || "https://x.com/cosyaura",
    Icon: Twitter,
  },
  {
    label: "YouTube",
    href:
      process.env.NEXT_PUBLIC_YOUTUBE_URL ||
      "https://www.youtube.com/@cosyaura",
    Icon: Youtube,
  },
] as const;

const COMPANY_LINKS = [
  { key: "footer.about", href: "/about" },
  { key: "footer.journal", href: "/blog" },
  { key: "footer.behind", href: "/behind-the-bottle" },
  { key: "footer.ingredients", href: "/ingredients" },
  { key: "footer.careers", href: "/careers" },
  { key: "footer.press", href: "/press" },
  { key: "footer.sustainability", href: "/sustainability" },
  { key: "footer.csr", href: "/corporate-social-responsibility" },
];

function FooterInfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white">
        {title}
      </h3>
      <div className="space-y-3 text-sm text-gray-400 leading-relaxed">{children}</div>
    </div>
  );
}

export function Footer() {
  const t = useT();
  const label = (key: string) => (key.startsWith("footer.") ? t(key) : key);

  const storePins: StorePin[] = [
    {
      id: "accra",
      label: t("footer.storeAccraLabel"),
      address: t("footer.storeAccraAddress"),
      // Kokomlemle / Olympic Street area, Accra
      lat: 5.5794,
      lng: -0.2081,
      directionsUrl:
        "https://www.google.com/maps/search/?api=1&query=56+Olympic+Street+Kokomlemle+Accra+Ghana",
      directionsLabel: t("footer.getDirections"),
    },
    {
      id: "yaounde",
      label: t("footer.storeYaoundeLabel"),
      address: t("footer.storeYaoundeAddress"),
      // Monte Meecham / Mont Fébé area, Yaoundé
      lat: 3.9125,
      lng: 11.4956,
      directionsUrl:
        "https://www.google.com/maps/search/?api=1&query=Monte+Meecham+Yaounde+Cameroon",
      directionsLabel: t("footer.getDirections"),
    },
    {
      id: "mamfe",
      label: t("footer.storeMamfeLabel"),
      address: t("footer.storeMamfeAddress"),
      // Mamfe, Southwest Region, Cameroon
      lat: 5.7667,
      lng: 9.3167,
      directionsUrl:
        "https://www.google.com/maps/search/?api=1&query=Mamfe+Cameroon",
      directionsLabel: t("footer.getDirections"),
    },
  ];

  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1 */}
          <div>
            <div className="mb-5">
              <BrandLogo variant="dark" size="lg" />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              {t("footer.tagline")}
            </p>
            <address className="not-italic text-sm text-gray-400 leading-relaxed mb-6 space-y-4">
              <span className="block text-white font-medium">
                {t("footer.visitStore")}
              </span>
              <span className="block">
                <span className="text-white/90">{t("footer.storeAccraLabel")}</span>
                <br />
                No 56 Olympic Street
                <br />
                Kokomlemle, Accra
              </span>
              <span className="block">
                <span className="text-white/90">{t("footer.storeYaoundeLabel")}</span>
                <br />
                Monte Meecham
                <br />
                Yaoundé, Cameroon
              </span>
              <span className="block">
                <span className="text-white/90">{t("footer.storeMamfeLabel")}</span>
                <br />
                Mamfe, Cameroon
              </span>
            </address>
            <div className="flex gap-4">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-gold hover:text-gold-light transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">{t("footer.shop")}</h3>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-gold transition-colors"
                  >
                    {label(link.key)}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link
                  href="/brands"
                  className="inline-flex items-center text-sm text-white hover:text-gold transition-colors tracking-wide"
                >
                  {t("footer.viewMore")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">{t("footer.support")}</h3>
            <ul className="space-y-2.5">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-gold transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <InstallAppLink className="text-sm text-gray-400 hover:text-gold transition-colors text-left" />
              </li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">{t("footer.company")}</h3>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-gold transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <FooterRegions />

      {/* Store locations — one map, two pins */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-8 lg:gap-12 items-start">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-2 text-white">
              {t("footer.visitStore")}
            </h3>
            <ul className="space-y-5 text-sm text-gray-400 mt-4">
              {storePins.map((pin) => (
                <li key={pin.id}>
                  <p className="font-medium text-white mb-1">{pin.label}</p>
                  <p className="leading-relaxed mb-2">{pin.address}</p>
                  <a
                    href={pin.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center font-medium text-[#FFD200] hover:text-white transition-colors"
                  >
                    {t("footer.getDirections")} →
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <StoreLocationsMap pins={storePins} />
        </div>
      </div>

      {/* Delivery & tracking */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <FooterInfoSection title={t("footer.deliveryTitle")}>
            <p>{t("footer.deliveryBody1")}</p>
            <p>{t("footer.deliveryBody2")}</p>
          </FooterInfoSection>

          <FooterInfoSection title={t("footer.trackingTitle")}>
            <p>{t("footer.trackingBody1")}</p>
            <p>{t("footer.trackingBody2")}</p>
          </FooterInfoSection>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} COSY AURA LLC. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-3">
            {["Visa", "Mastercard", "Amex", "PayPal"].map((method) => (
              <span
                key={method}
                className="text-[10px] text-gray-500 border border-gray-700 rounded px-2 py-1"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
