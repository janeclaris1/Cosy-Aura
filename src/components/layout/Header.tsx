"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { SearchBar } from "@/components/search/SearchBar";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { TopUtilityBar } from "@/components/layout/TopUtilityBar";
import { LocaleSwitcher } from "@/components/locale/LocaleSwitcher";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { cn, formatPrice } from "@/lib/utils";

const BRANDS = [
  { name: "Chanel", slug: "chanel" },
  { name: "Dior", slug: "dior" },
  { name: "Tom Ford", slug: "tom-ford" },
  { name: "Creed", slug: "creed" },
  { name: "Byredo", slug: "byredo" },
  { name: "Maison Francis Kurkdjian", slug: "maison-francis-kurkdjian" },
  { name: "Hermès", slug: "hermes" },
  { name: "Le Labo", slug: "le-labo" },
  { name: "Jo Malone", slug: "jo-malone" },
  { name: "Yves Saint Laurent", slug: "ysl" },
];

const PRICE_FILTERS = [
  { max: 150 },
  { min: 150, max: 250 },
  { min: 250, max: 400 },
  { min: 400 },
] as const;

const FRAGRANCE_FAMILIES = [
  { key: "family.floral", href: "/fragrances?fragranceFamily=FLORAL" },
  { key: "family.oriental", href: "/fragrances?fragranceFamily=ORIENTAL" },
  { key: "family.woody", href: "/fragrances?fragranceFamily=WOODY" },
  { key: "family.fresh", href: "/fragrances?fragranceFamily=FRESH" },
  { key: "family.citrus", href: "/fragrances?fragranceFamily=CITRUS" },
  { key: "family.spicy", href: "/fragrances?fragranceFamily=SPICY" },
];

const GENDERS = [
  { key: "gender.men", href: "/fragrances?gender=MENS" },
  { key: "gender.women", href: "/fragrances?gender=WOMENS" },
  { key: "gender.unisex", href: "/fragrances?gender=UNISEX" },
];

const CONCENTRATIONS = [
  { label: "EDT", href: "/fragrances?concentration=EDT" },
  { label: "EDP", href: "/fragrances?concentration=EDP" },
  { label: "Parfum", href: "/fragrances?concentration=PARFUM" },
  { label: "Extrait", href: "/fragrances?concentration=EXTRAIT" },
];

function NavDropdown({
  label,
  children,
  horizontal = false,
}: {
  label: string;
  children: React.ReactNode;
  horizontal?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="flex items-center gap-1 px-4 py-3 text-sm text-wf-black hover:text-gold transition-colors">
        {label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full left-0 bg-white border border-wf-border shadow-lg rounded-b-lg min-w-[200px] z-50 py-2",
            horizontal &&
              "flex flex-wrap items-center w-[50vw] max-w-[50vw] px-2"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { items, toggleCart } = useCartStore();
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const wishlistItems = useWishlistStore((s) => s.items);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const t = useT();

  const priceRanges = PRICE_FILTERS.map((range) => {
    if ("max" in range && !("min" in range)) {
      return {
        href: `/fragrances?maxPrice=${range.max}`,
        label: t("price.under", { price: formatPrice(range.max, currency) }),
      };
    }
    if ("min" in range && "max" in range) {
      return {
        href: `/fragrances?minPrice=${range.min}&maxPrice=${range.max}`,
        label: `${formatPrice(range.min, currency)} - ${formatPrice(range.max, currency)}`,
      };
    }
    return {
      href: `/fragrances?minPrice=${range.min}`,
      label: t("price.over", { price: formatPrice(range.min, currency) }),
    };
  });

  const atelierLinks = [
    { key: "nav.perfumeAtelier", href: "/atelier" },
    { key: "nav.giftFinder", href: "/gift-finder" },
    { key: "nav.occasions", href: "/occasions" },
    { key: "nav.seasonal", href: "/seasonal-guide" },
    { key: "nav.collections", href: "/collections" },
    { key: "nav.compare", href: "/compare" },
    { key: "nav.scentJournal", href: "/scent-journal" },
    { key: "nav.scentProfile", href: "/scent-profile" },
    { key: "nav.subscribe", href: "/subscribe" },
    { key: "nav.ingredients", href: "/ingredients" },
    { key: "nav.behindBottle", href: "/behind-the-bottle" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm">
      <TopUtilityBar />

      <div className="border-b border-wf-border bg-surface/95">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="shrink-0 hover:opacity-90 transition-opacity">
            <BrandLogo variant="light" size="md" />
          </Link>

          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <SearchBar />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <LocaleSwitcher />
            </div>

            <Link
              href="/wishlist"
              className="relative inline-flex items-center justify-center min-h-11 min-w-11 hover:text-gold transition-colors"
            >
              <Heart className="w-5 h-5" />
              {wishlistItems.length > 0 && (
                <span className="absolute top-1 right-1 bg-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            <Link
              href="/account"
              className="hidden sm:inline-flex items-center justify-center min-h-11 min-w-11 hover:text-gold transition-colors"
            >
              <User className="w-5 h-5" />
            </Link>

            <button
              onClick={toggleCart}
              className="relative inline-flex items-center justify-center min-h-11 min-w-11 hover:text-gold transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-3">
          <SearchBar />
        </div>
      </div>

      <nav className="site-nav hidden md:block border-b border-wf-border bg-ivory">
        <div className="max-w-7xl mx-auto px-4 flex items-center">
          <NavDropdown label={t("nav.brands")} horizontal>
            {BRANDS.map((brand) => (
              <Link
                key={brand.slug}
                href={`/fragrances/${brand.slug}`}
                className="block shrink-0 whitespace-nowrap px-4 py-2 text-sm hover:bg-wf-light hover:text-gold transition-colors"
              >
                {brand.name}
              </Link>
            ))}
          </NavDropdown>

          <NavDropdown label={t("nav.price")}>
            {priceRanges.map((range) => (
              <Link
                key={range.href}
                href={range.href}
                className="block px-4 py-2 text-sm hover:bg-wf-light hover:text-gold transition-colors"
              >
                {range.label}
              </Link>
            ))}
          </NavDropdown>

          <NavDropdown label={t("nav.family")}>
            {FRAGRANCE_FAMILIES.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="block px-4 py-2 text-sm hover:bg-wf-light hover:text-gold transition-colors"
              >
                {t(f.key)}
              </Link>
            ))}
          </NavDropdown>

          <NavDropdown label={t("nav.gender")}>
            {GENDERS.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="block px-4 py-2 text-sm hover:bg-wf-light hover:text-gold transition-colors"
              >
                {t(g.key)}
              </Link>
            ))}
          </NavDropdown>

          <NavDropdown label={t("nav.concentration")}>
            {CONCENTRATIONS.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="block px-4 py-2 text-sm hover:bg-wf-light hover:text-gold transition-colors"
              >
                {c.label}
              </Link>
            ))}
          </NavDropdown>

          <Link
            href="/fragrance-finder"
            className="px-4 py-3 text-sm font-medium hover:text-gold transition-colors"
          >
            {t("nav.finder")}
          </Link>

          <NavDropdown label={t("nav.atelier")}>
            {atelierLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2 text-sm hover:bg-wf-light hover:text-gold transition-colors"
              >
                {t(item.key)}
              </Link>
            ))}
          </NavDropdown>

          <Link
            href="/blog"
            className="px-4 py-3 text-sm font-medium hover:text-gold transition-colors"
          >
            {t("nav.journal")}
          </Link>
        </div>
      </nav>

      <div
        className={cn(
          "site-nav md:hidden overflow-y-auto transition-all duration-300 bg-ivory border-b border-wf-border",
          mobileOpen ? "max-h-[min(70vh,720px)]" : "max-h-0"
        )}
      >
        <div className="px-4 py-4 space-y-4">
          <LocaleSwitcher compact />
          <div>
            <p className="text-xs uppercase tracking-wider text-wf-gray mb-2">{t("nav.brands")}</p>
            <div className="flex w-full flex-wrap items-center gap-1 pb-1">
              {BRANDS.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/fragrances/${brand.slug}`}
                  className="shrink-0 whitespace-nowrap px-3 py-1.5 text-sm hover:bg-wf-light hover:text-gold"
                  onClick={() => setMobileOpen(false)}
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-wf-gray mb-2">{t("nav.shopBy")}</p>
            <div className="space-y-1">
              {priceRanges.map((r) => (
                <Link key={r.href} href={r.href} className="block text-sm py-1.5 hover:text-gold" onClick={() => setMobileOpen(false)}>
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-wf-gray mb-2">{t("nav.family")}</p>
            <div className="space-y-1">
              {FRAGRANCE_FAMILIES.map((f) => (
                <Link key={f.href} href={f.href} className="block text-sm py-1.5 hover:text-gold" onClick={() => setMobileOpen(false)}>
                  {t(f.key)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-wf-gray mb-2">{t("nav.gender")}</p>
            <div className="space-y-1">
              {GENDERS.map((g) => (
                <Link key={g.href} href={g.href} className="block text-sm py-1.5 hover:text-gold" onClick={() => setMobileOpen(false)}>
                  {t(g.key)}
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/fragrance-finder"
            className="block text-sm py-1.5 font-medium hover:text-gold"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.finder")}
          </Link>
          <Link
            href="/atelier"
            className="block text-sm py-1.5 font-medium hover:text-gold"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.perfumeAtelier")}
          </Link>
          <Link
            href="/gift-finder"
            className="block text-sm py-1.5 font-medium hover:text-gold"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.giftFinder")}
          </Link>
          <Link
            href="/scent-journal"
            className="block text-sm py-1.5 font-medium hover:text-gold"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.scentJournal")}
          </Link>
          <Link
            href="/blog"
            className="block text-sm py-1.5 font-medium hover:text-gold"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.journal")}
          </Link>
        </div>
      </div>
    </header>
  );
}
