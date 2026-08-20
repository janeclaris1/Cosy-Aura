"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Instagram, Facebook, Twitter, Youtube } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { FooterRegions } from "@/components/layout/FooterRegions";
import { useT } from "@/lib/locale-store";

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
            <address className="not-italic text-sm text-gray-400 leading-relaxed mb-6">
              30 N Gould St Ste R
              <br />
              Sheridan, WY 82801
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
            &copy; {new Date().getFullYear()} COSY AURA. {t("footer.rights")}
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
