"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCartStore, type CartItem } from "@/lib/store";
import { useLocaleStore, useT } from "@/lib/locale-store";
import { formatPrice } from "@/lib/utils";
import { useMemberDiscount } from "@/lib/use-member-discount";
import { useRegionalPrice } from "@/lib/use-regional-price";
import { salePriceForSize } from "@/lib/pricing";
import { isInStockForCountry } from "@/lib/country-stock";

type CrossSellProduct = {
  id: string;
  slug: string;
  model: string;
  stock: number;
  brand: { name: string };
  images: { url: string; alt?: string | null }[];
  countryStocks?: { country: string; inStock: boolean }[];
};

type GhanaHint = {
  threshold: number;
  gap: number;
  qualifies: boolean;
};

interface CartCrossSellProps {
  items: CartItem[];
  subtotalGhs: number;
}

function CrossSellCard({
  product,
  onAdd,
}: {
  product: CrossSellProduct;
  onAdd: (price: number) => void;
}) {
  const t = useT();
  const currency = useLocaleStore((s) => s.currency);
  const country = useLocaleStore((s) => s.country);
  const member = useMemberDiscount();
  const baseSale = salePriceForSize(30, product.slug);
  const regionalBase = useRegionalPrice(baseSale);
  const price = member.apply(regionalBase);
  const image = product.images[0]?.url || "/images/placeholders/fragrance.svg";
  const inStock = isInStockForCountry(
    { stock: product.stock, countryStocks: product.countryStocks },
    country,
    currency
  );

  if (!inStock) return null;

  return (
    <div className="shrink-0 w-[140px] border border-wf-border rounded bg-wf-light/40 p-2 flex flex-col">
      <Link href={`/fragrances/${product.slug}`} className="block">
        <div className="relative aspect-square bg-accent rounded overflow-hidden mb-2">
          <Image
            src={image}
            alt={product.model}
            fill
            className="object-contain"
            sizes="140px"
          />
        </div>
        <p className="text-[10px] uppercase tracking-wider font-semibold truncate">
          {product.brand.name}
        </p>
        <p className="text-xs text-wf-gray truncate">{product.model}</p>
        <p className="font-playfair text-sm text-gold mt-0.5">
          {formatPrice(price, currency)}
        </p>
      </Link>
      <button
        type="button"
        onClick={() => onAdd(price)}
        className="mt-2 w-full text-[11px] border border-espresso py-1.5 flex items-center justify-center gap-1 hover:bg-espresso hover:text-ivory transition-colors"
      >
        <Plus className="w-3 h-3" />
        {t("cart.addThisToo")}
      </button>
    </div>
  );
}

export function CartCrossSell({ items, subtotalGhs }: CartCrossSellProps) {
  const t = useT();
  const addItem = useCartStore((s) => s.addItem);
  const country = useLocaleStore((s) => s.country);
  const currency = useLocaleStore((s) => s.currency);
  const [products, setProducts] = useState<CrossSellProduct[]>([]);
  const [ghanaHint, setGhanaHint] = useState<GhanaHint | null>(null);
  const [loading, setLoading] = useState(false);

  const excludeKey = useMemo(
    () => items.map((i) => i.fragranceId).join(","),
    [items]
  );

  useEffect(() => {
    if (!items.length) {
      setProducts([]);
      setGhanaHint(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({
      context: "cart",
      exclude: excludeKey,
      anchorIds: excludeKey,
      limit: "4",
    });
    if (country) params.set("country", country);
    if (currency) params.set("currency", currency);
    if (
      (country?.toUpperCase() === "GH" || currency === "GHS") &&
      Number.isFinite(subtotalGhs)
    ) {
      params.set("subtotalGhs", String(Math.round(subtotalGhs)));
    }

    fetch(`/api/cross-sell?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setProducts(Array.isArray(data.fragrances) ? data.fragrances : []);
        setGhanaHint(data.ghanaFreeDelivery ?? null);
      })
      .catch(() => {
        /* ignore abort / network */
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [excludeKey, country, currency, subtotalGhs, items.length]);

  const showGhanaNudge =
    ghanaHint &&
    !ghanaHint.qualifies &&
    ghanaHint.gap > 0 &&
    (country?.toUpperCase() === "GH" || currency === "GHS");

  if (!items.length || loading || (!products.length && !showGhanaNudge)) {
    return null;
  }

  function handleAdd(product: CrossSellProduct, price: number) {
    const image = product.images[0]?.url || "/images/placeholders/fragrance.svg";
    addItem({
      fragranceId: product.id,
      slug: product.slug,
      brand: product.brand.name,
      model: `${product.model} · 30ml`,
      price,
      image,
      bottleSize: 30,
    });
  }

  return (
    <div className="border-t border-wf-border pt-5 space-y-3">
      {showGhanaNudge ? (
        <p className="text-xs text-gold bg-gold/5 border border-gold/20 px-3 py-2 leading-relaxed">
          {t("cart.freeDeliveryGap", {
            amount: formatPrice(ghanaHint.gap, "GHS"),
          })}
        </p>
      ) : null}

      {products.length ? (
        <>
          <p className="text-xs uppercase tracking-[0.12em] text-wf-gray">
            {t("cart.addThisTooTitle")}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {products.map((product) => (
              <CrossSellCard
                key={product.id}
                product={product}
                onAdd={(price) => handleAdd(product, price)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
