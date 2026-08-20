"use client";

import { useState } from "react";
import {
  ProductGallery,
  ProductInfo,
  ProductLeftExperience,
  ProductSpecsAccordion,
} from "@/components/products/ProductDetail";
import { isBottleSize, type BottleSize } from "@/lib/bottle-sizes";

type Fragrance = Parameters<typeof ProductInfo>[0]["fragrance"];

export function ProductPurchase({ fragrance }: { fragrance: Fragrance }) {
  const initial = isBottleSize(fragrance.bottleSize) ? fragrance.bottleSize : 50;
  const [size, setSize] = useState<BottleSize>(initial);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 pb-28 lg:pb-0">
      <div className="space-y-6">
        <ProductGallery
          images={fragrance.images}
          model={fragrance.model}
          brandName={fragrance.brand.name}
          brandSlug={fragrance.brand.slug}
          size={size}
          onSizeChange={setSize}
        />
        <ProductSpecsAccordion fragrance={fragrance} />
        <ProductLeftExperience fragrance={fragrance} />
      </div>
      <ProductInfo
        fragrance={fragrance}
        selectedSize={size}
        onSizeChange={setSize}
      />
    </div>
  );
}
