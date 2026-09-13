"use client";

import { useEffect, useRef, useState } from "react";
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
import { STORE_DISCOUNT_PERCENT, listPriceForSize, salePriceForSize } from "@/lib/pricing";
import {
  cardConcentrationLabel,
  inspiredByImageSrc,
  inspiredByOriginalLabel,
  isHouseOriginal,
} from "@/lib/inspired-by";
import { WhatsAppToCheckoutButton } from "@/components/checkout/WhatsAppOrderButton";
import { isInStockForCountry } from "@/lib/country-stock";
import { ProductEngagementStats } from "@/components/products/ProductEngagementStats";

interface ProductCardProps {
  fragrance: {
    id: string;
    slug: string;
    model: string;
    reference?: string;
    price: number;
    stock?: number;
    condition?: string;
    year?: number | null;
    bottleSize?: number;
    concentration?: string;
    sustainabilityScore?: number | null;
    isVegan?: boolean;
    isCrueltyFree?: boolean;
    fragranceFamily?: string | null;
    brand: { name: string; slug?: string };
    images: { url: string; alt?: string | null }[];
    countryStocks?: { country: string; inStock: boolean }[];
    viewCount?: number;
    likeCount?: number;
  };
  currency?: string;
  animate?: boolean;
}

export function ProductCard({
  fragrance,
  currency: currencyProp,
  animate = true,
}: ProductCardProps) {
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
  const primaryImage = fragrance.images[0]?.url || "/images/placeholders/fragrance.svg";
  const house = isHouseOriginal(fragrance.brand.slug);
  const inspiredSrc = inspiredByImageSrc(fragrance.brand.slug);
  const [inspiredUrl, setInspiredUrl] = useState(inspiredSrc);
  const concentration = cardConcentrationLabel(fragrance.concentration);
  const discount = STORE_DISCOUNT_PERCENT;
  const member = useMemberDiscount();
  const baseSalePrice = salePriceForSize(30, fragrance.slug);
  const regionalSalePrice = useRegionalPrice(baseSalePrice);
  const salePrice =
    mounted && member.active ? member.apply(regionalSalePrice) : regionalSalePrice;
  const originalPrice = useRegionalPrice(listPriceForSize(30, fragrance.slug));
  const inStock = isInStockForCountry(
    { stock: fragrance.stock ?? 0, countryStocks: fragrance.countryStocks },
    country,
    currency
  );

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
        href={`/fragrances/${fragrance.slug}`}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03045e]"
      >
        <div className="relative bg-gradient-to-b from-[#f7f6f3] via-white to-white px-2.5 pt-3 pb-1 sm:px-3 sm:pt-4">
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2 sm:p-2.5">
            <span className="inline-flex items-center rounded-full bg-[#03045e] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white sm:text-[10px]">
              −{discount}%
            </span>
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

          <div
            className={cn(
              "flex items-end",
              house ? "justify-center" : "gap-1.5 sm:gap-2"
            )}
          >
            <div
              className={cn(
                "relative aspect-[3/4] overflow-hidden",
                house ? "w-[78%] max-w-[200px]" : "min-w-0 flex-1"
              )}
            >
              <Image
                src={primaryImage}
                alt={fragrance.images[0]?.alt || fragrance.model}
                fill
                className={cn(
                  "object-contain object-bottom transition-transform duration-500 ease-organic",
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

            {!house && (
              <div className="flex w-[34%] shrink-0 flex-col items-center pb-1 sm:w-[32%]">
                <p className="mb-1 text-[8px] font-bold uppercase leading-none tracking-[0.1em] text-[#c8102e] sm:text-[9px]">
                  Inspired by
                </p>
                <div className="relative aspect-[3/4] w-full max-h-[6.5rem] overflow-hidden rounded-sm bg-white ring-1 ring-stone-100 sm:max-h-[7.25rem]">
                  <Image
                    src={inspiredUrl}
                    alt={`Inspired by ${fragrance.brand.name} ${fragrance.model}`}
                    fill
                    className="object-contain object-top p-0.5"
                    sizes="(max-width: 768px) 18vw, 8vw"
                    onError={() => setInspiredUrl("/images/inspired/fallback.png")}
                  />
                </div>
                <p className="mt-1 line-clamp-2 px-0.5 text-center text-[8px] font-semibold uppercase leading-tight tracking-wide text-stone-700 sm:text-[9px]">
                  {inspiredByOriginalLabel(fragrance.brand.name, fragrance.model)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-stone-100 px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
          <p className="truncate text-[9px] font-medium uppercase tracking-[0.2em] text-stone-500 sm:text-[10px]">
            {fragrance.brand.name}
          </p>
          <h3 className="mt-1 font-playfair text-[13px] leading-snug text-[#03045e] sm:text-sm">
            {fragrance.model}
            <span className="text-stone-400 font-roboto font-normal"> · {concentration}</span>
          </h3>

          <div className="mt-2.5 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5">
            <p className="font-playfair text-lg leading-none text-[#03045e] sm:text-xl">
              {t("product.from", { price: formatPrice(salePrice, currency, rates) })}
            </p>
            <p className="text-[11px] text-stone-400 line-through sm:text-xs">
              {formatPrice(originalPrice, currency, rates)}
            </p>
          </div>
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

        {inStock ? (
          <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
            <WhatsAppToCheckoutButton
              compact
              label={t("product.orderWhatsApp")}
              onPrepareCart={() =>
                addItem({
                  fragranceId: fragrance.id,
                  slug: fragrance.slug,
                  brand: fragrance.brand.name,
                  model: `${fragrance.model} · 30ml`,
                  price: salePrice,
                  image: primaryImage,
                  bottleSize: 30,
                })
              }
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
