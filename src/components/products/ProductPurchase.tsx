"use client";

import { useState } from "react";
import {
  ProductGallery,
  ProductInfo,
  ProductLeftExperience,
  ProductSpecsAccordion,
} from "@/components/products/ProductDetail";
import { CatalogProductPurchase } from "@/components/products/CatalogProductPurchase";
import { ProductReviews } from "@/components/products/ProductReviews";
import { isBottleSize, type BottleSize } from "@/lib/bottle-sizes";
import { isPerfumeProduct } from "@/lib/product-catalog";
import { PdpSponsoredAd } from "@/components/products/PdpSponsoredAd";
import { parsePdpSponsoredAd } from "@/lib/pdp-sponsored-ad";

type Fragrance = Parameters<typeof ProductInfo>[0]["fragrance"] & {
  productType?: import("@prisma/client").ProductType;
  pdpSponsoredAd?: unknown;
};

export function ProductPurchase({ fragrance }: { fragrance: Fragrance }) {
  const sponsoredAd = parsePdpSponsoredAd(fragrance.pdpSponsoredAd);

  if (!isPerfumeProduct(fragrance.productType)) {
    return (
      <CatalogProductPurchase
        fragrance={{
          ...fragrance,
          productType: fragrance.productType ?? "WATCH",
        }}
        sponsoredAd={sponsoredAd}
      />
    );
  }
  return (
    <PerfumeProductPurchase fragrance={fragrance} sponsoredAd={sponsoredAd} />
  );
}

function PerfumeProductPurchase({
  fragrance,
  sponsoredAd,
}: {
  fragrance: Fragrance;
  sponsoredAd: ReturnType<typeof parsePdpSponsoredAd>;
}) {
  const initial = isBottleSize(fragrance.bottleSize) ? fragrance.bottleSize : 50;
  const [size, setSize] = useState<BottleSize>(initial);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 pb-28 lg:pb-0">
        <div className="space-y-6">
          <ProductGallery
            images={fragrance.images}
            model={fragrance.model}
            brandName={fragrance.brand.name}
            brandSlug={fragrance.brand.slug}
            size={size}
            onSizeChange={setSize}
            explainerVideoUrl={fragrance.explainerVideoUrl}
          />
          <ProductSpecsAccordion fragrance={fragrance} />
          <PdpSponsoredAd config={sponsoredAd} className="mt-0" />
          <ProductLeftExperience fragrance={fragrance} />
        </div>
        <ProductInfo
          fragrance={fragrance}
          selectedSize={size}
          onSizeChange={setSize}
        />
      </div>
      <ProductReviews fragranceId={fragrance.id} />
    </>
  );
}
