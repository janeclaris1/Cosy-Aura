"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { formatPrice, cn } from "@/lib/utils";
import { useRegionalPrice } from "@/lib/use-regional-price";
import { useMemberDiscount } from "@/lib/use-member-discount";
import { STORE_DISCOUNT_PERCENT, listPriceForSize, salePriceForSize } from "@/lib/pricing";
import {
  cardConcentrationLabel,
  inspiredByImageSrc,
  inspiredByLine,
  inspiredByOriginalLabel,
  isHouseOriginal,
} from "@/lib/inspired-by";
import { WhatsAppToCheckoutButton } from "@/components/checkout/WhatsAppOrderButton";
import { isInStockForCountry } from "@/lib/country-stock";

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
  const storeCurrency = useLocaleStore((s) => s.currency);
  const country = useLocaleStore((s) => s.country);
  useLocaleStore((s) => s.rates);
  const currency = currencyProp || storeCurrency;
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
  const salePrice = member.apply(useRegionalPrice(baseSalePrice));
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
    <div ref={ref} className={cn("group", animate && "fade-in-scroll")}>
      <Link href={`/fragrances/${fragrance.slug}`} className="block text-center">
        <div className="relative mb-2.5">
          <div className={cn("flex items-start", house ? "justify-center" : "gap-1 sm:gap-2")}>
            <div
              className={cn(
                "relative aspect-[3/4]",
                house ? "w-[72%] max-w-[220px]" : "flex-1 min-w-0"
              )}
            >
              <Image
                src={primaryImage}
                alt={fragrance.images[0]?.alt || fragrance.model}
                fill
                className={cn(
                  "object-contain object-bottom transition-transform duration-700 ease-organic group-hover:scale-[1.03]",
                  !inStock && "opacity-60"
                )}
                sizes="(max-width: 768px) 40vw, (max-width: 1024px) 22vw, 14vw"
              />
              {!inStock && (
                <span className="absolute inset-x-2 bottom-2 z-10 bg-espresso/90 text-ivory text-[10px] uppercase tracking-wider py-1">
                  Out of stock
                </span>
              )}
            </div>

            {!house && (
              <div className="w-[36%] sm:w-[34%] shrink-0 pt-0.5 flex flex-col items-center">
                <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.06em] text-[#c8102e] uppercase leading-none mb-1.5">
                  Inspired By
                </p>
                <div className="relative w-full aspect-[3/4] max-h-[7.5rem] sm:max-h-[8.5rem]">
                  <Image
                    src={inspiredUrl}
                    alt={`Inspired by ${fragrance.brand.name} ${fragrance.model}`}
                    fill
                    className="object-contain object-top"
                    sizes="(max-width: 768px) 18vw, 8vw"
                    onError={() => setInspiredUrl("/images/inspired/fallback.png")}
                  />
                </div>
                <p className="mt-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.04em] text-black leading-snug px-0.5">
                  {inspiredByOriginalLabel(fragrance.brand.name, fragrance.model)}
                </p>
              </div>
            )}
          </div>

          <span className="absolute top-0 left-0 text-[10px] tracking-[0.12em] uppercase text-espresso/80 bg-white/90 px-2 py-1">
            -{discount}%
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleItem(fragrance.id);
            }}
            className="absolute top-0 right-0 min-h-11 min-w-11 bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            aria-label={isWishlisted ? t("product.wishlistRemove") : t("product.wishlistAdd")}
          >
            <Heart
              className={cn(
                "w-3.5 h-3.5",
                isWishlisted ? "fill-highlight text-highlight" : "text-mocha"
              )}
            />
          </button>
        </div>

        <div className="flex flex-col items-center text-center w-full gap-0.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-mocha">
            {fragrance.brand.name}
          </p>
          <h3 className="font-playfair text-sm sm:text-[15px] text-black leading-snug">
            {fragrance.model} | {concentration}
          </h3>
          {!house && (
            <p className="text-[11px] text-mocha leading-snug">
              {inspiredByLine(fragrance.brand.name, fragrance.model)}
            </p>
          )}

          <div className="w-8 h-px bg-black mx-auto my-1.5" />
          <p className="font-playfair text-xl leading-none text-[#c8102e]">
            {t("product.from", { price: formatPrice(salePrice, currency) })}
          </p>
          <p className="text-xs text-mocha line-through">
            {formatPrice(originalPrice, currency)}
          </p>
        </div>
      </Link>
      {inStock ? (
        <div className="mt-2 px-0.5" onClick={(e) => e.stopPropagation()}>
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
  );
}
