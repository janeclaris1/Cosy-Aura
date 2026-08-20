"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/store";
import { useT } from "@/lib/locale-store";
import { ProductCard } from "@/components/products/ProductCard";

export default function WishlistPage() {
  const t = useT();
  const wishlistIds = useWishlistStore((s) => s.items);
  const [fragrances, setFragrances] = useState<
    Parameters<typeof ProductCard>[0]["fragrance"][]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlistIds.length === 0) {
      setLoading(false);
      return;
    }

    fetch(`/api/fragrances?ids=${wishlistIds.join(",")}`)
      .then((res) => res.json())
      .then((data) => {
        setFragrances(data.fragrances || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [wishlistIds]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-wf-gray">{t("wishlist.loading")}</p>
      </div>
    );
  }

  if (fragrances.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Heart className="w-12 h-12 text-secondary mx-auto mb-4" />
        <h1 className="font-playfair text-3xl mb-4">{t("wishlist.title")}</h1>
        <p className="text-wf-gray mb-8">{t("wishlist.empty")}</p>
        <Link href="/fragrances" className="btn-gold">
          {t("wishlist.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl mb-8">{t("wishlist.title")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-10">
        {fragrances.map((fragrance) => (
          <ProductCard key={fragrance.id} fragrance={fragrance} />
        ))}
      </div>
    </div>
  );
}
