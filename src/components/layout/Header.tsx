"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  ShoppingBag,
  User,
  Menu,
  X,
  ChevronDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { SearchBar } from "@/components/search/SearchBar";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { TopUtilityBar } from "@/components/layout/TopUtilityBar";
import { LocaleSwitcher } from "@/components/locale/LocaleSwitcher";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { cn, formatPrice } from "@/lib/utils";
import { useIsClientMounted } from "@/lib/use-is-client-mounted";
import { CATALOGS, FASHION_CATALOGS } from "@/lib/product-catalog";

const SHOP_CATEGORIES = [
  { label: CATALOGS.fragrances.label, href: CATALOGS.fragrances.path },
  ...FASHION_CATALOGS.map((slug) => ({
    label: CATALOGS[slug].label,
    href: CATALOGS[slug].path,
  })),
];

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

function FilterSection({
  title,
  children,
  columns = false,
}: {
  title: string;
  children: React.ReactNode;
  columns?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-wf-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-[#03045e]">{title}</span>
        <ChevronDown
          className={cn("w-4 h-4 text-wf-gray transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className={cn("px-2 pb-3", columns && "flex flex-wrap gap-1")}>{children}</div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  children,
  onClick,
  compact = false,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "block text-sm text-[#03045e] hover:bg-wf-light rounded-lg transition-colors",
        compact ? "shrink-0 whitespace-nowrap px-3 py-1.5" : "px-3 py-2"
      )}
    >
      {children}
    </Link>
  );
}

function isCatalogActive(path: string, pathname: string) {
  if (path === "/fragrances") {
    return pathname === "/fragrances" || pathname.startsWith("/fragrances/");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

const CATALOG_CHIPS = SHOP_CATEGORIES;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const pathname = usePathname();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const mounted = useIsClientMounted();
  const { items, toggleCart } = useCartStore();
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const wishlistItems = useWishlistStore((s) => s.items);
  const cartCount = mounted
    ? items.reduce((sum, i) => sum + i.quantity, 0)
    : 0;
  const wishlistCount = mounted ? wishlistItems.length : 0;
  const t = useT();

  // Avoid locale-sensitive currency strings until after mount so SSR HTML
  // matches the first client paint (Intl can differ en vs fr for GHS).
  const priceLabel = (amount: number) =>
    mounted ? formatPrice(amount, currency) : String(amount);

  const priceRanges = PRICE_FILTERS.map((range) => {
    if ("max" in range && !("min" in range)) {
      return {
        href: `/fragrances?maxPrice=${range.max}`,
        label: t("price.under", { price: priceLabel(range.max) }),
      };
    }
    if ("min" in range && "max" in range) {
      return {
        href: `/fragrances?minPrice=${range.min}&maxPrice=${range.max}`,
        label: `${priceLabel(range.min)} - ${priceLabel(range.max)}`,
      };
    }
    return {
      href: `/fragrances?minPrice=${range.min}`,
      label: t("price.over", { price: priceLabel(range.min) }),
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

  const closeFilter = useCallback(() => setFilterOpen(false), []);

  const focusSearch = useCallback(() => {
    const input = searchAnchorRef.current?.querySelector("input");
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filterOpen]);

  const chipActive = (href: string) => isCatalogActive(href, pathname);

  return (
    <header className="site-header sticky top-0 z-40 bg-primary">
      <TopUtilityBar />

      <div className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="shrink-0 hover:opacity-90 transition-opacity">
            <BrandLogo variant="dark" size="md" />
          </Link>

          <div ref={searchAnchorRef} className="hidden md:flex flex-1 max-w-xl mx-8">
            <SearchBar onDark />
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-white">
            <div className="hidden sm:block">
              <LocaleSwitcher onDark />
            </div>

            <Link
              href="/wishlist"
              className="relative inline-flex items-center justify-center min-h-11 min-w-11 text-white hover:text-[#FFD200] transition-colors"
            >
              <Bookmark className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#FFD200] text-[#03045e] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/account"
              className="hidden sm:inline-flex items-center justify-center min-h-11 min-w-11 text-white hover:text-[#FFD200] transition-colors"
            >
              <User className="w-5 h-5" />
            </Link>

            <button
              onClick={toggleCart}
              className="relative inline-flex items-center justify-center min-h-11 min-w-11 text-white hover:text-[#FFD200] transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-1 right-1 bg-[#FFD200] text-[#03045e] text-[10px] font-bold min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </button>

            <button
              className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-3">
          <SearchBar onDark />
        </div>
      </div>

      <nav className="site-nav hidden md:block bg-primary border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={focusSearch}
            className="site-nav-icon-btn"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-thin py-0.5">
            {CATALOG_CHIPS.map((chip) => {
              const active = chipActive(chip.href);
              return (
                <Link
                  key={`${chip.href}-${chip.label}`}
                  href={chip.href}
                  className={cn(
                    "site-nav-chip",
                    active ? "site-nav-chip--active" : "site-nav-chip--idle"
                  )}
                >
                  {chip.label}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={cn("site-nav-icon-btn", filterOpen && "bg-[#FFD200] text-[#03045e]")}
            aria-label="Browse filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {filterOpen && (
        <div className="fixed inset-0 z-[70] hidden md:block">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("common.close")}
            onClick={closeFilter}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-wf-border bg-white px-4 py-4">
              <h2 className="font-playfair text-lg text-[#03045e]">{t("nav.shopBy")}</h2>
              <button
                type="button"
                onClick={closeFilter}
                className="p-1 text-wf-gray hover:text-[#03045e]"
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <FilterSection title={t("nav.brands")} columns>
              {BRANDS.map((brand) => (
                <FilterLink
                  key={brand.slug}
                  href={`/fragrances/${brand.slug}`}
                  onClick={closeFilter}
                  compact
                >
                  {brand.name}
                </FilterLink>
              ))}
            </FilterSection>

            <FilterSection title={t("nav.price")}>
              {priceRanges.map((range) => (
                <FilterLink key={range.href} href={range.href} onClick={closeFilter}>
                  {range.label}
                </FilterLink>
              ))}
            </FilterSection>

            <FilterSection title={t("nav.family")}>
              {FRAGRANCE_FAMILIES.map((f) => (
                <FilterLink key={f.href} href={f.href} onClick={closeFilter}>
                  {t(f.key)}
                </FilterLink>
              ))}
            </FilterSection>

            <FilterSection title={t("nav.gender")}>
              {GENDERS.map((g) => (
                <FilterLink key={g.href} href={g.href} onClick={closeFilter}>
                  {t(g.key)}
                </FilterLink>
              ))}
            </FilterSection>

            <FilterSection title={t("nav.concentration")}>
              {CONCENTRATIONS.map((c) => (
                <FilterLink key={c.label} href={c.href} onClick={closeFilter}>
                  {c.label}
                </FilterLink>
              ))}
            </FilterSection>

            <FilterSection title={t("nav.atelier")}>
              {atelierLinks.map((item) => (
                <FilterLink key={item.href} href={item.href} onClick={closeFilter}>
                  {t(item.key)}
                </FilterLink>
              ))}
            </FilterSection>

            <div className="px-4 py-3 space-y-1 border-b border-wf-border">
              <FilterLink href="/fragrance-finder" onClick={closeFilter}>
                {t("nav.finder")}
              </FilterLink>
              <FilterLink href="/blog" onClick={closeFilter}>
                {t("nav.journal")}
              </FilterLink>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "site-nav md:hidden overflow-y-auto transition-all duration-300 bg-primary text-white border-t border-white/10",
          mobileOpen ? "max-h-[min(70vh,720px)]" : "max-h-0"
        )}
      >
        <div className="px-4 py-4 space-y-4">
          <LocaleSwitcher compact onDark />

          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CATALOG_CHIPS.map((chip) => {
              const active = chipActive(chip.href);
              return (
                <Link
                  key={`mobile-${chip.href}-${chip.label}`}
                  href={chip.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "site-nav-chip text-[11px] px-3 py-1.5",
                    active ? "site-nav-chip--active" : "site-nav-chip--idle"
                  )}
                >
                  {chip.label}
                </Link>
              );
            })}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 mb-2">{t("nav.brands")}</p>
            <div className="flex w-full flex-wrap items-center gap-1 pb-1">
              {BRANDS.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/fragrances/${brand.slug}`}
                  className="shrink-0 whitespace-nowrap px-3 py-1.5 text-sm text-white hover:text-[#FFD200]"
                  onClick={() => setMobileOpen(false)}
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 mb-2">Shop</p>
            <div className="space-y-1">
              {SHOP_CATEGORIES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-sm py-1.5 text-white hover:text-[#FFD200]"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 mb-2">{t("nav.shopBy")}</p>
            <div className="space-y-1">
              {priceRanges.map((r) => (
                <Link key={r.href} href={r.href} className="block text-sm py-1.5 text-white hover:text-[#FFD200]" onClick={() => setMobileOpen(false)}>
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 mb-2">{t("nav.family")}</p>
            <div className="space-y-1">
              {FRAGRANCE_FAMILIES.map((f) => (
                <Link key={f.href} href={f.href} className="block text-sm py-1.5 text-white hover:text-[#FFD200]" onClick={() => setMobileOpen(false)}>
                  {t(f.key)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 mb-2">{t("nav.gender")}</p>
            <div className="space-y-1">
              {GENDERS.map((g) => (
                <Link key={g.href} href={g.href} className="block text-sm py-1.5 text-white hover:text-[#FFD200]" onClick={() => setMobileOpen(false)}>
                  {t(g.key)}
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/fragrance-finder"
            className="block text-sm py-1.5 font-bold text-white hover:text-[#FFD200]"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.finder")}
          </Link>
          <Link
            href="/atelier"
            className="block text-sm py-1.5 font-bold text-white hover:text-[#FFD200]"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.perfumeAtelier")}
          </Link>
          <Link
            href="/gift-finder"
            className="block text-sm py-1.5 font-bold text-white hover:text-[#FFD200]"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.giftFinder")}
          </Link>
          <Link
            href="/scent-journal"
            className="block text-sm py-1.5 font-bold text-white hover:text-[#FFD200]"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.scentJournal")}
          </Link>
          <Link
            href="/blog"
            className="block text-sm py-1.5 font-bold text-white hover:text-[#FFD200]"
            onClick={() => setMobileOpen(false)}
          >
            {t("nav.journal")}
          </Link>
        </div>
      </div>
    </header>
  );
}
