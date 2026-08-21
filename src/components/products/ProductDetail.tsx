"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronDown, Heart, Shield, Truck, RotateCcw } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { usePremiumStore } from "@/lib/premium-store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import {
  formatPrice,
  fragranceFamilyLabel,
  bottleMaterialLabel,
  capTypeLabel,
  concentrationLabel,
  sillageLabel,
  cn,
} from "@/lib/utils";
import { TranslatedText } from "@/components/locale/TranslatedText";
import type { UiLang } from "@/lib/geo-locale";
import { ProductPromises } from "@/components/ui/VerifiedBadge";
import { ScentPyramid } from "@/components/perfume/ScentPyramid";
import {
  cardConcentrationLabel,
  inspiredByImageSrc,
  inspiredByLine,
  inspiredByOriginalLabel,
  isHouseOriginal,
} from "@/lib/inspired-by";
import { CompareToggle } from "@/components/perfume/CompareToggle";
import { isInStockForCountry } from "@/lib/country-stock";
import { emptySizeStock, type SizeStockMap } from "@/lib/size-stock";
import { WhatsAppToCheckoutButton } from "@/components/checkout/WhatsAppOrderButton";
import { VirtualNose } from "@/components/perfume/VirtualNose";
import { ScentMemoryPanel } from "@/components/perfume/ScentMemoryPanel";
import { IngredientsMap } from "@/components/perfume/IngredientsMap";
import {
  BOTTLE_SIZES,
  priceForBottleSize,
  type BottleSize,
  isBottleSize,
} from "@/lib/bottle-sizes";
import {
  STORE_DISCOUNT_PERCENT,
  SAMPLE_LIST_GHS,
  SAMPLE_SIZE_ML,
  listPriceForSize,
  salePriceForSize,
  sampleSalePrice,
} from "@/lib/pricing";
import { BottleProductImage } from "@/components/products/BottleProductImage";
import { MetaViewContent } from "@/components/analytics/MetaViewContent";
import { useRegionalPrice } from "@/lib/use-regional-price";
import { useMemberDiscount } from "@/lib/use-member-discount";

interface ProductGalleryProps {
  images: { url: string; alt: string | null }[];
  model: string;
  brandName?: string;
  brandSlug?: string;
  size?: BottleSize;
  onSizeChange?: (size: BottleSize) => void;
}

export function ProductGallery({
  images,
  model,
  brandName,
  brandSlug,
  size = 50,
  onSizeChange,
}: ProductGalleryProps) {
  const [zoomed, setZoomed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [originalIndex, setOriginalIndex] = useState(0);
  const [inspiredUrl, setInspiredUrl] = useState(inspiredByImageSrc(brandSlug));
  const house = isHouseOriginal(brandSlug);
  const original = images[originalIndex] || images[0];
  const prevSize = useRef(size);

  useEffect(() => {
    if (prevSize.current !== size) {
      prevSize.current = size;
      setShowOriginal(false);
    }
  }, [size]);

  function selectOriginal(index: number) {
    setOriginalIndex(index);
    setShowOriginal(true);
  }

  function selectVariation(ml: BottleSize) {
    setShowOriginal(false);
    onSizeChange?.(ml);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 sm:gap-5">
        <div
          className="relative aspect-square flex-1 overflow-hidden bg-ivory cursor-zoom-in"
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => setZoomed(false)}
        >
          {showOriginal ? (
            <Image
              src={original?.url || "/images/placeholders/fragrance.svg"}
              alt={original?.alt || model}
              fill
              priority
              className={cn(
                "object-contain transition-transform duration-500",
                zoomed && "scale-110"
              )}
              sizes="(max-width: 1024px) 70vw, 40vw"
            />
          ) : (
            <BottleProductImage
              brand={brandName || "Cosy Aura"}
              model={model}
              size={size}
              alt={`${model} ${size}ml`}
              fillParent
              priority
              imgClassName={cn(
                "transition-transform duration-500",
                zoomed && "scale-110"
              )}
              sizes="(max-width: 1024px) 70vw, 40vw"
            />
          )}
        </div>
        {!house && brandName && (
          <div className="w-[28%] max-w-[140px] shrink-0 pt-1 flex flex-col items-center text-center">
            <p className="text-[10px] font-bold tracking-[0.08em] text-[#c8102e] uppercase mb-2">
              Inspired By
            </p>
            <div className="relative w-full aspect-[3/4]">
              <Image
                src={inspiredUrl}
                alt={`Inspired by ${brandName} ${model}`}
                fill
                className="object-contain"
                sizes="140px"
                onError={() => setInspiredUrl("/images/inspired/fallback.png")}
              />
            </div>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.06em] text-black leading-snug">
              {inspiredByOriginalLabel(brandName, model)}
            </p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 max-w-md">
        {images.slice(0, 1).map((img, i) => (
          <button
            key={`orig-${i}`}
            type="button"
            onClick={() => selectOriginal(i)}
            className={cn(
              "relative aspect-square overflow-hidden border bg-ivory transition-colors",
              showOriginal ? "border-espresso" : "border-transparent hover:border-wf-border"
            )}
            aria-label={`${model} photo`}
          >
            <Image
              src={img.url}
              alt={img.alt || model}
              fill
              className="object-contain"
              sizes="100px"
            />
          </button>
        ))}
        {BOTTLE_SIZES.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => selectVariation(ml)}
            className={cn(
              "relative aspect-square overflow-hidden border bg-ivory transition-colors",
              !showOriginal && size === ml
                ? "border-espresso"
                : "border-transparent hover:border-wf-border"
            )}
            aria-label={`${ml} ml`}
          >
            <BottleProductImage
              brand={brandName || "Cosy Aura"}
              model={model}
              size={ml}
              alt={`${model} ${ml}ml`}
              fillParent
              sizes="100px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface ProductInfoProps {
  fragrance: {
    id: string;
    slug: string;
    model: string;
    reference: string;
    price: number;
    condition: string;
    description: string;
    conditionReport: string | null;
    year: number | null;
    fragranceFamily: string;
    bottleMaterial: string;
    bottleDetail?: string | null;
    bottleSize: number;
    capType: string;
    liquidColor: string | null;
    longevity: string | null;
    concentration: string;
    topNotes: string[];
    heartNotes: string[];
    baseNotes: string[];
    sillage: string;
    collection?: string | null;
    stock?: number;
    rating?: number | null;
    sampleAvailable?: boolean;
    isVegan?: boolean;
    isCrueltyFree?: boolean;
    sustainabilityScore?: number | null;
    brand: { name: string; slug: string };
    images: { url: string; alt: string | null }[];
    countryStocks?: { country: string; inStock: boolean }[];
  };
}

type SpecFragrance = Pick<
  ProductInfoProps["fragrance"],
  | "year"
  | "collection"
  | "fragranceFamily"
  | "bottleMaterial"
  | "bottleDetail"
  | "bottleSize"
  | "capType"
  | "liquidColor"
  | "longevity"
  | "concentration"
  | "topNotes"
  | "heartNotes"
  | "baseNotes"
  | "sillage"
  | "stock"
  | "rating"
  | "countryStocks"
>;

function buildSpecs(
  fragrance: SpecFragrance,
  t: (key: string, vars?: Record<string, string | number>) => string,
  lang: UiLang,
  inStockForCountry?: boolean | null
) {
  const notesSummary = [
    fragrance.topNotes.length
      ? `${t("pdp.topNotes")}: ${fragrance.topNotes.join(", ")}`
      : null,
    fragrance.heartNotes.length
      ? `${t("pdp.heartNotes")}: ${fragrance.heartNotes.join(", ")}`
      : null,
    fragrance.baseNotes.length
      ? `${t("pdp.baseNotes")}: ${fragrance.baseNotes.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const availability =
    inStockForCountry != null
      ? inStockForCountry
        ? t("pdp.inStock")
        : t("pdp.outOfStock")
      : fragrance.stock === undefined
        ? t("pdp.na")
        : fragrance.stock > 0
          ? t("pdp.inStock")
          : t("pdp.outOfStock");

  return [
    { label: t("pdp.formula"), value: t("pdp.formulaValue") },
    { label: t("pdp.year"), value: fragrance.year?.toString() || t("pdp.na") },
    { label: t("pdp.collection"), value: fragrance.collection || t("pdp.na") },
    {
      label: t("pdp.family"),
      value: fragranceFamilyLabel(fragrance.fragranceFamily, lang),
    },
    {
      label: t("pdp.bottleMaterial"),
      value:
        fragrance.bottleDetail || bottleMaterialLabel(fragrance.bottleMaterial, lang),
    },
    { label: t("pdp.size"), value: `${fragrance.bottleSize} ml` },
    {
      label: t("pdp.sizes"),
      value: BOTTLE_SIZES.map((s) => `${s} ml`).join(" · "),
    },
    { label: t("pdp.capType"), value: capTypeLabel(fragrance.capType, lang) },
    {
      label: t("pdp.liquidColor"),
      value: fragrance.liquidColor || t("pdp.na"),
    },
    { label: t("pdp.longevity"), value: fragrance.longevity || t("pdp.na") },
    {
      label: t("pdp.concentration"),
      value: concentrationLabel(fragrance.concentration, lang),
    },
    { label: t("pdp.notes"), value: notesSummary || t("pdp.na") },
    { label: t("pdp.sillage"), value: sillageLabel(fragrance.sillage, lang) },
    {
      label: t("pdp.availability"),
      value: availability,
    },
    {
      label: t("pdp.rating"),
      value:
        fragrance.rating != null ? `${fragrance.rating.toFixed(1)} / 5` : t("pdp.na"),
    },
  ];
}

/** Specs as a left-column accordion dropdown */
export function ProductSpecsAccordion({
  fragrance,
  className,
  defaultOpen = false,
}: {
  fragrance: SpecFragrance;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const t = useT();
  const language = useLocaleStore((s) => s.language);
  const country = useLocaleStore((s) => s.country);
  const currency = useLocaleStore((s) => s.currency);
  const inStock = isInStockForCountry(
    { stock: fragrance.stock ?? 0, countryStocks: fragrance.countryStocks },
    country,
    currency
  );
  const specs = buildSpecs(fragrance, t, language, inStock);

  return (
    <div className={cn("border border-wf-border bg-ivory", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="font-playfair text-lg">{t("product.details")}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-wf-gray transition-transform duration-organic ease-organic",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-organic ease-organic",
          open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <table className="w-full text-sm border-t border-wf-border">
          <tbody>
            {specs.map((spec) => (
              <tr key={spec.label} className="border-b border-wf-border last:border-b-0">
                <td className="py-2.5 pl-4 pr-2 text-wf-gray w-[38%] align-top">
                  {spec.label}
                </td>
                <td className="py-2.5 pr-4 font-medium align-top">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeftFeatureAccordion({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("border border-wf-border bg-ivory overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="font-playfair text-lg">{title}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-wf-gray transition-transform duration-organic ease-organic",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-wf-border p-3 md:p-4">{children}</div>
      )}
    </div>
  );
}

/** Virtual Nose, Memory, Ingredients - left column dropdowns */
export function ProductLeftExperience({
  fragrance,
}: {
  fragrance: ProductInfoProps["fragrance"];
}) {
  const t = useT();
  const primaryImage = fragrance.images[0]?.url || "";

  return (
    <div className="space-y-3">
      <LeftFeatureAccordion title={t("pdp.virtualNose")}>
        <VirtualNose
          className="!border-0"
          model={fragrance.model}
          brand={fragrance.brand.name}
          fragranceFamily={fragrance.fragranceFamily}
          concentration={fragrance.concentration}
          sillage={fragrance.sillage}
          longevity={fragrance.longevity}
          topNotes={fragrance.topNotes}
          heartNotes={fragrance.heartNotes}
          baseNotes={fragrance.baseNotes}
        />
      </LeftFeatureAccordion>

      <LeftFeatureAccordion title={t("pdp.scentMemory")}>
        <ScentMemoryPanel
          className="!border-0 !p-0 !bg-transparent"
          fragranceId={fragrance.id}
          slug={fragrance.slug}
          brand={fragrance.brand.name}
          model={fragrance.model}
          image={primaryImage}
        />
      </LeftFeatureAccordion>

      <LeftFeatureAccordion title={t("pdp.ingredientsMap")}>
        <IngredientsMap
          className="!border-0"
          compact
          notes={[
            ...fragrance.topNotes,
            ...fragrance.heartNotes,
            ...fragrance.baseNotes,
          ]}
        />
      </LeftFeatureAccordion>
    </div>
  );
}

export function ProductInfo({
  fragrance,
  selectedSize: selectedSizeProp,
  onSizeChange,
}: ProductInfoProps & {
  selectedSize?: BottleSize;
  onSizeChange?: (size: BottleSize) => void;
}) {
  const [openAccordion, setOpenAccordion] = useState<string | null>("description");
  const catalogSize = isBottleSize(fragrance.bottleSize)
    ? fragrance.bottleSize
    : 50;
  const [internalSize, setInternalSize] = useState<BottleSize>(catalogSize);
  const selectedSize = selectedSizeProp ?? internalSize;
  const setSelectedSize = onSizeChange ?? setInternalSize;
  const [sizeStock, setSizeStock] = useState<SizeStockMap>(emptySizeStock());
  const [sizeStockLoaded, setSizeStockLoaded] = useState(false);
  const country = useLocaleStore((s) => s.country);
  const currency = useLocaleStore((s) => s.currency);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/store/size-stock?fragranceId=${encodeURIComponent(fragrance.id)}&country=${encodeURIComponent(country || "")}`
        );
        const data = await res.json();
        if (!cancelled && res.ok && data.quantities) {
          setSizeStock({
            30: Number(data.quantities[30] || 0),
            50: Number(data.quantities[50] || 0),
            100: Number(data.quantities[100] || 0),
          });
        }
      } catch {
        /* keep zeros */
      } finally {
        if (!cancelled) setSizeStockLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fragrance.id, country]);
  const baseDisplayPrice = priceForBottleSize(
    fragrance.price,
    fragrance.bottleSize || 100,
    selectedSize,
    fragrance.slug
  );
  const member = useMemberDiscount();
  const regionalSale = useRegionalPrice(baseDisplayPrice);
  const displayPrice = member.apply(regionalSale);
  const addItem = useCartStore((s) => s.addItem);
  useLocaleStore((s) => s.rates);
  const t = useT();
  const { toggleItem, hasItem } = useWishlistStore();
  const isWishlisted = hasItem(fragrance.id);
  const primaryImage = fragrance.images[0]?.url || "";
  const house = isHouseOriginal(fragrance.brand.slug);
  const concentration = cardConcentrationLabel(fragrance.concentration);
  const originalPrice = useRegionalPrice(listPriceForSize(selectedSize, fragrance.slug));
  const regionalSampleBase = useRegionalPrice(sampleSalePrice());
  const regionalSamplePrice = member.apply(regionalSampleBase);
  const regionalSampleList = useRegionalPrice(SAMPLE_LIST_GHS);
  const regionalPrice30 = member.apply(useRegionalPrice(salePriceForSize(30, fragrance.slug)));
  const compareCount = usePremiumStore((s) => s.compare.length);
  const countryInStock = isInStockForCountry(
    { stock: fragrance.stock ?? 0, countryStocks: fragrance.countryStocks },
    country,
    currency
  );
  const selectedSizeInStock =
    !sizeStockLoaded || sizeStock[selectedSize] > 0;
  const inStock = countryInStock && selectedSizeInStock;

  useEffect(() => {
    if (!sizeStockLoaded) return;
    if (sizeStock[selectedSize] > 0) return;
    const firstAvailable = BOTTLE_SIZES.find((s) => sizeStock[s] > 0);
    if (firstAvailable) setSelectedSize(firstAvailable);
  }, [sizeStockLoaded, sizeStock, selectedSize, setSelectedSize]);

  function handleAddToCart() {
    if (!inStock) return;
    addItem({
      fragranceId: fragrance.id,
      slug: fragrance.slug,
      brand: fragrance.brand.name,
      model: `${fragrance.model} · ${selectedSize}ml`,
      price: regionalSale,
      image: primaryImage,
      bottleSize: selectedSize,
    });
  }
  const regionalPrice50 = member.apply(useRegionalPrice(salePriceForSize(50, fragrance.slug)));
  const regionalPrice100 = member.apply(useRegionalPrice(salePriceForSize(100, fragrance.slug)));
  const sizeSalePrices: Record<BottleSize, number> = {
    30: regionalPrice30,
    50: regionalPrice50,
    100: regionalPrice100,
  };

  const accordions = [
    {
      id: "description",
      title: t("pdp.description"),
      content: <TranslatedText text={fragrance.description} as="div" />,
    },
    {
      id: "condition",
      title: t("pdp.condition"),
      content: fragrance.conditionReport ? (
        <TranslatedText text={fragrance.conditionReport} as="div" />
      ) : (
        t("pdp.conditionEmpty")
      ),
    },
    {
      id: "shipping",
      title: t("pdp.shipping"),
      content: t("pdp.shippingBody"),
    },
  ];

  return (
    <div
      data-fragrance-product
      data-brand={fragrance.brand.name}
      data-model={fragrance.model}
      data-reference={fragrance.reference}
      data-price={displayPrice}
      data-bottle-size={selectedSize}
    >
      <MetaViewContent
        contentId={fragrance.id}
        contentName={`${fragrance.brand.name} ${fragrance.model}`}
        value={displayPrice}
        currency={currency}
      />
      <nav className="text-[11px] uppercase tracking-[0.14em] text-mocha mb-6">
        <a href="/" className="hover:text-espresso">
          Home
        </a>
        <span className="mx-2 text-wf-border">/</span>
        <a href="/fragrances" className="hover:text-espresso">
          Fragrances
        </a>
        <span className="mx-2 text-wf-border">/</span>
        <a href={`/fragrances/${fragrance.brand.slug}`} className="hover:text-espresso">
          {fragrance.brand.name}
        </a>
        <span className="mx-2 text-wf-border">/</span>
        <span className="text-espresso">{fragrance.model}</span>
      </nav>

      <p
        className="text-[11px] uppercase tracking-[0.2em] text-mocha mb-2"
        data-fragrance-brand
      >
        {fragrance.brand.name}
      </p>
      <h1
        className="font-playfair text-3xl md:text-[2.5rem] leading-tight text-espresso mb-2"
        data-fragrance-model
      >
        {fragrance.model} | {concentration}
      </h1>
      {!house && (
        <p className="text-sm text-mocha mb-3">
          {inspiredByLine(fragrance.brand.name, fragrance.model)}
        </p>
      )}
      <ProductPromises
        className="text-sm text-espresso mb-5"
        badgeClassName="w-3.5 h-3.5 text-espresso shrink-0"
      />

      <p className="font-playfair text-3xl text-[#c8102e] leading-none mb-1" data-fragrance-price>
        {formatPrice(displayPrice, currency)}
      </p>
      <p className="text-sm text-mocha mb-1">
        <span className="line-through">{formatPrice(originalPrice, currency)}</span>
        <span className="ml-2 text-[11px] uppercase tracking-wide">
          -{STORE_DISCOUNT_PERCENT}%
        </span>
        {member.active ? (
          <span className="ml-2 text-[11px] uppercase tracking-wide text-gold">
            +{member.percent}% member
          </span>
        ) : null}
      </p>
      <p className="text-xs text-mocha mb-6">{selectedSize} ml · Oil-based · Alcohol-free</p>

      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-mocha mb-2">
          {t("pdp.size")}
        </p>
        <div className="flex flex-wrap gap-2">
          {BOTTLE_SIZES.map((size) => {
            const sizeAvailable = !sizeStockLoaded || sizeStock[size] > 0;
            return (
            <button
              key={size}
              type="button"
              onClick={() => sizeAvailable && setSelectedSize(size)}
              disabled={!sizeAvailable}
              className={cn(
                "min-w-[4.75rem] px-4 py-2.5 text-sm border transition-colors duration-organic ease-organic",
                selectedSize === size
                  ? "border-espresso bg-espresso text-ivory"
                  : "border-wf-border bg-ivory text-espresso hover:border-espresso",
                !sizeAvailable && "opacity-40 cursor-not-allowed hover:border-wf-border"
              )}
              aria-pressed={selectedSize === size}
            >
              {size} ml
              <span className="block text-[10px] mt-0.5 font-normal opacity-80">
                {sizeAvailable
                  ? formatPrice(sizeSalePrices[size], currency)
                  : t("pdp.outOfStock")}
              </span>
            </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          className="btn-primary flex-1 min-w-[160px] disabled:opacity-50"
        >
          {inStock ? t("product.addToCart") : t("pdp.outOfStock")}
        </button>
        <button
          onClick={() => toggleItem(fragrance.id)}
          className="w-12 h-12 border border-espresso flex items-center justify-center hover:bg-espresso hover:text-ivory transition-colors"
          aria-label={isWishlisted ? t("product.wishlistRemove") : t("product.wishlistAdd")}
        >
          <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
        </button>
        <CompareToggle
          item={{
            id: fragrance.id,
            slug: fragrance.slug,
            brand: fragrance.brand.name,
            model: fragrance.model,
            price: fragrance.price,
            image: primaryImage,
            fragranceFamily: fragrance.fragranceFamily,
            concentration: fragrance.concentration,
            longevity: fragrance.longevity,
            sillage: fragrance.sillage,
            bottleSize: fragrance.bottleSize,
            topNotes: fragrance.topNotes,
            heartNotes: fragrance.heartNotes,
            baseNotes: fragrance.baseNotes,
          }}
        />
      </div>

      {inStock ? (
        <div className="mb-6">
          <WhatsAppToCheckoutButton
            label={t("product.orderWhatsApp")}
            onPrepareCart={handleAddToCart}
          />
        </div>
      ) : (
        <p className="mb-6 text-sm text-mocha">
          {t("product.outOfStockLocation")}
        </p>
      )}

      {/* Mobile sticky buy bar */}
      <div
        className={cn(
          "lg:hidden fixed inset-x-0 z-30 border-t border-wf-border bg-white/95 backdrop-blur-md px-4 py-3 flex gap-2",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          compareCount > 0 ? "bottom-[4.75rem]" : "bottom-0"
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-mocha truncate">
            {fragrance.model} · {selectedSize} ml
          </p>
          <p className="font-playfair text-lg text-[#c8102e] leading-none">
            {formatPrice(displayPrice, currency)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock}
          className="btn-primary shrink-0 px-5 disabled:opacity-50"
        >
          {inStock ? t("product.addToCart") : t("pdp.outOfStock")}
        </button>
        <button
          type="button"
          onClick={() => toggleItem(fragrance.id)}
          className="min-h-11 min-w-11 border border-espresso flex items-center justify-center"
          aria-label={isWishlisted ? t("product.wishlistRemove") : t("product.wishlistAdd")}
        >
          <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
        </button>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-[12px] uppercase tracking-[0.1em] text-mocha">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-espresso" />
          <span>{t("product.securePayment")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-espresso" />
          <span>{t("product.fastShipping")}</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 text-espresso" />
          <span>{t("product.returns14")}</span>
        </div>
      </div>

      <div className="mb-8 border border-wf-border bg-ivory p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-mocha mb-1">
          Sample recommendation
        </p>
        <p className="font-playfair text-lg text-espresso">
          Try a {SAMPLE_SIZE_ML} ml vial first
        </p>
        <p className="text-sm text-mocha mt-1 mb-3">
          Same undiluted oil as the full bottle - live with the scent, then size up.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="font-playfair text-2xl text-[#c8102e]">
              {formatPrice(regionalSamplePrice, currency)}
            </span>
            <span className="ml-2 text-sm text-mocha line-through">
              {formatPrice(regionalSampleList, currency)}
            </span>
            <span className="ml-2 text-[11px] uppercase tracking-wide text-mocha">
              -{STORE_DISCOUNT_PERCENT}%
            </span>
          </p>
          <button
            type="button"
            onClick={() =>
              addItem({
                fragranceId: fragrance.id,
                slug: fragrance.slug,
                brand: fragrance.brand.name,
                model: `${fragrance.model} · ${SAMPLE_SIZE_ML}ml sample`,
                price: regionalSampleBase,
                image: primaryImage,
                bottleSize: SAMPLE_SIZE_ML,
              })
            }
            className="px-5 py-2.5 text-sm border border-espresso text-espresso hover:bg-espresso hover:text-ivory transition-colors"
          >
            {t("pdp.sample")}
          </button>
        </div>
      </div>

      <ScentPyramid
        className="mb-8"
        topNotes={fragrance.topNotes}
        heartNotes={fragrance.heartNotes}
        baseNotes={fragrance.baseNotes}
      />

      <div className="border-t border-wf-border">
        {accordions.map((acc) => (
          <div key={acc.id} className="border-b border-wf-border">
            <button
              onClick={() =>
                setOpenAccordion(openAccordion === acc.id ? null : acc.id)
              }
              className="flex items-center justify-between w-full py-3.5 text-left font-cormorant text-base tracking-[0.04em] font-medium"
            >
              {acc.title}
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-mocha transition-transform",
                  openAccordion === acc.id && "rotate-180"
                )}
              />
            </button>
            {openAccordion === acc.id && (
              <div className="pb-4 font-cormorant text-[15px] text-mocha leading-relaxed tracking-[0.02em]">
                {acc.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
