"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronDown, Bookmark, Shield, Truck, RotateCcw, Play } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { formatPrice, cn } from "@/lib/utils";
import { TranslatedText } from "@/components/locale/TranslatedText";
import { ProductPromises } from "@/components/ui/VerifiedBadge";
import { isInStockForCountry } from "@/lib/country-stock";
import { WhatsAppToCheckoutButton } from "@/components/checkout/WhatsAppOrderButton";
import { MetaViewContent } from "@/components/analytics/MetaViewContent";
import { ProductEngagementStats } from "@/components/products/ProductEngagementStats";
import { ProductReviews } from "@/components/products/ProductReviews";
import { useRegionalPrice } from "@/lib/use-regional-price";
import { useMemberDiscount } from "@/lib/use-member-discount";
import { parseProductVideoUrl } from "@/lib/product-video";
import {
  CATALOG_PRODUCT_PROMISES,
  catalogForProductType,
  catalogPlaceholder,
} from "@/lib/product-catalog";
import type { ProductType } from "@prisma/client";

export type CatalogPurchaseFragrance = {
  id: string;
  slug: string;
  productType: ProductType;
  model: string;
  reference: string;
  price: number;
  condition: string;
  description: string;
  conditionReport: string | null;
  year: number | null;
  bottleMaterial: string;
  bottleDetail?: string | null;
  bottleSize: number;
  liquidColor: string | null;
  longevity: string | null;
  collection?: string | null;
  stock?: number;
  rating?: number | null;
  brand: { name: string; slug: string };
  images: { url: string; alt: string | null }[];
  countryStocks?: { country: string; inStock: boolean }[];
  viewCount?: number;
  likeCount?: number;
  explainerVideoUrl?: string | null;
};

type GalleryMode = { kind: "image"; index: number } | { kind: "video" };

function CatalogProductGallery({
  images,
  model,
  productType,
  explainerVideoUrl,
}: {
  images: { url: string; alt: string | null }[];
  model: string;
  productType: ProductType;
  explainerVideoUrl?: string | null;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [mode, setMode] = useState<GalleryMode>({ kind: "image", index: 0 });
  const video = parseProductVideoUrl(explainerVideoUrl);
  const fallback = catalogPlaceholder(productType);
  const activeImage = images[mode.kind === "image" ? mode.index : 0] || images[0];

  const thumbClass = (active: boolean) =>
    cn(
      "relative aspect-square w-full overflow-hidden border bg-ivory transition-colors",
      active ? "border-espresso" : "border-transparent hover:border-wf-border"
    );

  if (images.length === 0 && !video) {
    return (
      <div className="relative aspect-square w-full overflow-hidden bg-ivory">
        <Image
          src={fallback}
          alt={model}
          fill
          priority
          className="object-contain p-8"
          sizes="(max-width: 1024px) 90vw, 45vw"
        />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 sm:gap-4">
      {images.length > 1 || video ? (
        <div className="flex w-[72px] shrink-0 flex-col gap-2 overflow-y-auto sm:w-20 max-h-[min(70vh,560px)]">
          {images.map((img, i) => (
            <button
              key={`photo-${i}`}
              type="button"
              onClick={() => setMode({ kind: "image", index: i })}
              className={thumbClass(mode.kind === "image" && mode.index === i)}
              aria-label={`${model} photo ${i + 1}`}
            >
              <Image
                src={img.url}
                alt={img.alt || model}
                fill
                className="object-contain"
                sizes="80px"
              />
            </button>
          ))}
          {video ? (
            <button
              type="button"
              onClick={() => setMode({ kind: "video" })}
              className={cn(thumbClass(mode.kind === "video"), "bg-espresso/5")}
              aria-label={`${model} product video`}
            >
              {video.kind === "youtube" ? (
                <Image src={video.thumbUrl} alt="" fill className="object-cover" sizes="80px" />
              ) : (
                <span className="absolute inset-0 bg-espresso/10" aria-hidden />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-sm">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-espresso text-espresso" />
                </span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "relative aspect-square min-w-0 flex-1 overflow-hidden bg-ivory cursor-zoom-in"
        )}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
      >
        {mode.kind === "video" && video ? (
          video.kind === "youtube" ? (
            <iframe
              src={video.embedUrl}
              title={`${model} product video`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={video.url}
              controls
              playsInline
              className="absolute inset-0 h-full w-full object-contain bg-black"
              title={`${model} product video`}
            />
          )
        ) : (
          <Image
            src={activeImage?.url || fallback}
            alt={activeImage?.alt || model}
            fill
            priority
            className={cn(
              "object-contain transition-transform duration-500",
              zoomed && "scale-110"
            )}
            sizes="(max-width: 1024px) 70vw, 40vw"
          />
        )}
      </div>
    </div>
  );
}

function buildCatalogSpecs(
  fragrance: CatalogPurchaseFragrance,
  inStock: boolean,
  t: (key: string) => string
) {
  const availability = inStock ? t("pdp.inStock") : t("pdp.outOfStock");
  const rows: { label: string; value: string }[] = [
    { label: "Reference", value: fragrance.reference || t("pdp.na") },
  ];

  if (fragrance.collection) {
    rows.push({ label: "Collection", value: fragrance.collection });
  }
  if (fragrance.year) {
    rows.push({ label: t("pdp.year"), value: String(fragrance.year) });
  }

  switch (fragrance.productType) {
    case "WATCH":
      if (fragrance.bottleDetail) rows.push({ label: "Case", value: fragrance.bottleDetail });
      if (fragrance.longevity) rows.push({ label: "Movement", value: fragrance.longevity });
      break;
    case "SNEAKER":
      if (fragrance.bottleDetail) rows.push({ label: "Details", value: fragrance.bottleDetail });
      if (fragrance.liquidColor) rows.push({ label: "Colourway", value: fragrance.liquidColor });
      if (fragrance.bottleSize) rows.push({ label: "Size (EU)", value: String(fragrance.bottleSize) });
      break;
    case "SHIRT":
      if (fragrance.bottleMaterial) rows.push({ label: "Fabric", value: fragrance.bottleMaterial });
      if (fragrance.liquidColor) rows.push({ label: "Colour", value: fragrance.liquidColor });
      if (fragrance.bottleSize) rows.push({ label: "Size", value: String(fragrance.bottleSize) });
      break;
    case "SUNGLASSES":
      if (fragrance.bottleDetail) rows.push({ label: "Frame", value: fragrance.bottleDetail });
      if (fragrance.liquidColor) rows.push({ label: "Lens", value: fragrance.liquidColor });
      break;
    default:
      if (fragrance.bottleDetail) rows.push({ label: "Details", value: fragrance.bottleDetail });
  }

  if (fragrance.condition) {
    rows.push({ label: t("pdp.condition"), value: fragrance.condition });
  }

  rows.push({ label: t("pdp.availability"), value: availability });

  if (fragrance.rating != null) {
    rows.push({ label: t("pdp.rating"), value: `${fragrance.rating.toFixed(1)} / 5` });
  }

  return rows;
}

function CatalogSpecsAccordion({
  fragrance,
  className,
}: {
  fragrance: CatalogPurchaseFragrance;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const country = useLocaleStore((s) => s.country);
  const currency = useLocaleStore((s) => s.currency);
  const inStock = isInStockForCountry(
    { stock: fragrance.stock ?? 0, countryStocks: fragrance.countryStocks },
    country,
    currency
  );
  const specs = buildCatalogSpecs(fragrance, inStock, t);

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

function DetailAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-wf-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-3.5 text-left font-cormorant text-base tracking-[0.04em] font-medium"
        aria-expanded={open}
      >
        {title}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-mocha transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="pb-4 font-cormorant text-[15px] text-mocha leading-relaxed tracking-[0.02em]">
          {children}
        </div>
      )}
    </div>
  );
}

function CatalogProductInfo({ fragrance }: { fragrance: CatalogPurchaseFragrance }) {
  const t = useT();
  const country = useLocaleStore((s) => s.country);
  const currency = useLocaleStore((s) => s.currency);
  useLocaleStore((s) => s.rates);
  const catalog = catalogForProductType(fragrance.productType);
  const member = useMemberDiscount();
  const regionalPrice = useRegionalPrice(fragrance.price);
  const displayPrice = member.apply(regionalPrice);
  const addItem = useCartStore((s) => s.addItem);
  const { toggleItem, hasItem } = useWishlistStore();
  const isWishlisted = hasItem(fragrance.id);
  const primaryImage =
    fragrance.images[0]?.url || catalogPlaceholder(fragrance.productType);
  const inStock = isInStockForCountry(
    { stock: fragrance.stock ?? 0, countryStocks: fragrance.countryStocks },
    country,
    currency
  );

  function handleAddToCart() {
    if (!inStock) return;
    addItem({
      fragranceId: fragrance.id,
      slug: fragrance.slug,
      brand: fragrance.brand.name,
      model: fragrance.model,
      price: regionalPrice,
      image: primaryImage,
    });
  }

  return (
    <div
      data-fragrance-product
      data-brand={fragrance.brand.name}
      data-model={fragrance.model}
      data-reference={fragrance.reference}
      data-price={displayPrice}
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
        <a href={catalog.path} className="hover:text-espresso">
          {catalog.label}
        </a>
        <span className="mx-2 text-wf-border">/</span>
        <a
          href={`${catalog.path}?brand=${encodeURIComponent(fragrance.brand.slug)}`}
          className="hover:text-espresso"
        >
          {fragrance.brand.name}
        </a>
        <span className="mx-2 text-wf-border">/</span>
        <span className="text-espresso">{fragrance.model}</span>
      </nav>

      <p className="text-[11px] uppercase tracking-[0.2em] text-mocha mb-2">
        {fragrance.brand.name}
      </p>
      <h1 className="font-playfair text-3xl md:text-[2.5rem] leading-tight text-espresso mb-2">
        {fragrance.model}
      </h1>
      {fragrance.reference ? (
        <p className="text-sm text-mocha mb-2">Ref. {fragrance.reference}</p>
      ) : null}

      <ProductEngagementStats
        fragranceId={fragrance.id}
        viewCount={fragrance.viewCount ?? 0}
        likeCount={fragrance.likeCount ?? 0}
        trackView
        className="mb-4 max-w-sm"
      />

      <ProductPromises
        className="text-sm text-espresso mb-5"
        badgeClassName="w-3.5 h-3.5 text-espresso shrink-0"
        items={CATALOG_PRODUCT_PROMISES}
      />

      <p className="font-playfair text-3xl text-[#c8102e] leading-none mb-1">
        {formatPrice(displayPrice, currency)}
      </p>
      {member.active ? (
        <p className="text-sm text-mocha mb-6">
          <span className="text-[11px] uppercase tracking-wide text-gold">
            +{member.percent}% member discount applied
          </span>
        </p>
      ) : (
        <div className="mb-6" />
      )}

      {fragrance.condition ? (
        <p className="text-xs uppercase tracking-[0.12em] text-mocha mb-6">
          Condition · {fragrance.condition}
        </p>
      ) : null}

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
          <Bookmark className={cn("w-5 h-5", isWishlisted && "fill-current")} />
        </button>
      </div>

      {inStock ? (
        <div className="mb-6">
          <WhatsAppToCheckoutButton
            label={t("product.orderWhatsApp")}
            onPrepareCart={handleAddToCart}
          />
        </div>
      ) : (
        <p className="mb-6 text-sm text-mocha">{t("product.outOfStockLocation")}</p>
      )}

      <div
        className={cn(
          "lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-wf-border bg-white/95 backdrop-blur-md px-4 py-3 flex gap-2",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-mocha truncate">{fragrance.model}</p>
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
          <Bookmark className={cn("w-5 h-5", isWishlisted && "fill-current")} />
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

      <div className="border-t border-wf-border">
        <DetailAccordion title={t("pdp.description")} defaultOpen>
          <TranslatedText text={fragrance.description} as="div" />
        </DetailAccordion>
        <DetailAccordion title={t("pdp.condition")}>
          {fragrance.conditionReport ? (
            <TranslatedText text={fragrance.conditionReport} as="div" />
          ) : (
            t("pdp.conditionEmpty")
          )}
        </DetailAccordion>
        <DetailAccordion title={t("pdp.shipping")}>
          {t("pdp.shippingBody")}
        </DetailAccordion>
      </div>
    </div>
  );
}

export function CatalogProductPurchase({
  fragrance,
}: {
  fragrance: CatalogPurchaseFragrance;
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 pb-28 lg:pb-0">
        <div className="space-y-6">
          <CatalogProductGallery
            images={fragrance.images}
            model={fragrance.model}
            productType={fragrance.productType}
            explainerVideoUrl={fragrance.explainerVideoUrl}
          />
          <CatalogSpecsAccordion fragrance={fragrance} />
        </div>
        <CatalogProductInfo fragrance={fragrance} />
      </div>
      <ProductReviews fragranceId={fragrance.id} />
    </>
  );
}
