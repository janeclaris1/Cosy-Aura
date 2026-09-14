"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import {
  useShopperCountry,
  useShopperCurrency,
  useShopperRates,
  useT,
} from "@/lib/locale-store";
import { formatPrice, cn } from "@/lib/utils";
import { useRegionalPrice } from "@/lib/use-regional-price";
import { useMemberDiscount } from "@/lib/use-member-discount";
import { useIsClientMounted } from "@/lib/use-is-client-mounted";
import { WhatsAppToCheckoutButton } from "@/components/checkout/WhatsAppOrderButton";
import { SignInForPricingLink } from "@/components/products/SignInForPricingLink";
import { useIsCatalogPriceHidden } from "@/lib/use-catalog-price-visibility";
import { isInStockForCountry } from "@/lib/country-stock";
import { ProductEngagementStats } from "@/components/products/ProductEngagementStats";
import {
  catalogForProductType,
  catalogPlaceholder,
  productDetailPath,
} from "@/lib/product-catalog";
import type { ProductType } from "@prisma/client";

export interface CatalogCardFragrance {
  id: string;
  slug: string;
  productType?: ProductType;
  model: string;
  reference?: string;
  price: number;
  stock?: number;
  condition?: string;
  brand: { name: string; slug?: string };
  images: { url: string; alt?: string | null }[];
  countryStocks?: { country: string; inStock: boolean }[];
  viewCount?: number;
  likeCount?: number;
}

interface CatalogProductCardProps {
  fragrance: CatalogCardFragrance;
  currency?: string;
  animate?: boolean;
}

export function CatalogProductCard({
  fragrance,
  currency: currencyProp,
  animate = true,
}: CatalogProductCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useIsClientMounted();
  const shopperCurrency = useShopperCurrency();
  const country = useShopperCountry();
  const rates = useShopperRates();
  const currency = currencyProp || shopperCurrency;
  const t = useT();
  const { toggleItem, hasItem } = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);
  const isWishlisted = hasItem(fragrance.id);
  const productType = fragrance.productType ?? "WATCH";
  const catalog = catalogForProductType(productType);
  const primaryImage =
    fragrance.images[0]?.url || catalogPlaceholder(productType);
  const member = useMemberDiscount();
  const regionalPrice = useRegionalPrice(fragrance.price);
  const displayPrice =
    mounted && member.active ? member.apply(regionalPrice) : regionalPrice;
  const inStock = isInStockForCountry(
    { stock: fragrance.stock ?? 0, countryStocks: fragrance.countryStocks },
    country,
    currency
  );
  const priceHidden = useIsCatalogPriceHidden(productType);
  const detailHref = productDetailPath(productType, fragrance.slug);

  useEffect(() => {
    if (!animate) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return (
    <article
      ref={ref}
      className={cn(
        "group/card flex h-full flex-col overflow-hidden bg-white",
        "ring-1 ring-stone-200/90 shadow-[0_1px_2px_rgba(3,4,94,0.04)]",
        "transition-all duration-300 ease-organic",
        "hover:shadow-[0_8px_30px_rgba(3,4,94,0.08)] hover:ring-[#03045e]/15",
        animate && "fade-in-scroll"
      )}
    >
      <Link
        href={detailHref}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03045e]"
      >
        <div className="relative bg-gradient-to-b from-[#f7f6f3] via-white to-white px-2.5 pt-3 pb-1 sm:px-3 sm:pt-4">
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2 sm:p-2.5">
            {fragrance.condition ? (
              <span className="inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#03045e] ring-1 ring-stone-200/80 sm:text-[10px]">
                {fragrance.condition}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#03045e] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white sm:text-[10px]">
                {catalog.label.replace(/s$/, "")}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleItem(fragrance.id);
              }}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                "bg-white/90 backdrop-blur-sm ring-1 ring-stone-200/80",
                "transition-colors hover:bg-white hover:ring-[#03045e]/25"
              )}
              aria-label={isWishlisted ? t("product.wishlistRemove") : t("product.wishlistAdd")}
            >
              <Bookmark
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  isWishlisted ? "fill-[#03045e] text-[#03045e]" : "text-stone-500"
                )}
              />
            </button>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden">
            <Image
              src={primaryImage}
              alt={fragrance.images[0]?.alt || fragrance.model}
              fill
              className={cn(
                "object-contain p-2 transition-transform duration-500 ease-organic",
                "group-hover/card:scale-[1.04]",
                !inStock && "opacity-55 grayscale-[0.15]"
              )}
              sizes="(max-width: 768px) 44vw, (max-width: 1024px) 22vw, 14vw"
            />
            {!inStock && (
              <span className="absolute inset-x-2 bottom-2 z-10 rounded-sm bg-[#03045e] px-2 py-1 text-center text-[9px] font-medium uppercase tracking-[0.12em] text-white sm:text-[10px]">
                {t("pdp.outOfStock")}
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-stone-100 px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
          <p className="truncate text-[9px] font-medium uppercase tracking-[0.2em] text-stone-500 sm:text-[10px]">
            {fragrance.brand.name}
          </p>
          <h3 className="mt-1 font-playfair text-[13px] leading-snug text-[#03045e] sm:text-sm">
            {fragrance.model}
          </h3>
          {fragrance.reference ? (
            <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-stone-400">
              Ref. {fragrance.reference}
            </p>
          ) : null}

          {priceHidden ? (
            <SignInForPricingLink variant="card" />
          ) : (
            <p className="mt-2.5 font-playfair text-lg leading-none text-[#03045e] sm:text-xl">
              {formatPrice(displayPrice, currency, rates)}
            </p>
          )}
        </div>
      </Link>

      <div className="mt-auto border-t border-stone-100 px-3 py-2.5 sm:px-3.5">
        <ProductEngagementStats
          fragranceId={fragrance.id}
          viewCount={fragrance.viewCount ?? 0}
          likeCount={fragrance.likeCount ?? 0}
          compact
          className="text-stone-500"
        />

        {inStock && !priceHidden ? (
          <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
            <WhatsAppToCheckoutButton
              compact
              label={t("product.orderWhatsApp")}
              onPrepareCart={() =>
                addItem({
                  fragranceId: fragrance.id,
                  slug: fragrance.slug,
                  brand: fragrance.brand.name,
                  model: fragrance.model,
                  price: displayPrice,
                  image: primaryImage,
                  productType,
                })
              }
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
