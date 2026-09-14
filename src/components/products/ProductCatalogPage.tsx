import { Suspense } from "react";
import { ActiveFilters } from "@/components/products/FilterSidebar";
import { InfiniteFragranceGrid } from "@/components/products/InfiniteFragranceGrid";
import { ProductToolbar } from "@/components/products/ProductToolbar";
import {
  getFilterOptions,
  getFragrances,
  parseFragranceListFilters,
  FRAGRANCE_PAGE_SIZE,
} from "@/lib/fragrances";
import { getCatalog, type CatalogSlug } from "@/lib/product-catalog";

interface ProductCatalogPageProps {
  catalog: CatalogSlug;
  searchParams: Record<string, string | undefined>;
  brandSlug?: string;
  showHeader?: boolean;
}

export async function ProductCatalogPage({
  catalog,
  searchParams,
  brandSlug,
  showHeader = catalog !== "fragrances",
}: ProductCatalogPageProps) {
  const config = getCatalog(catalog);
  const filters = parseFragranceListFilters(searchParams, {
    brandSlug,
    page: 1,
    limit: FRAGRANCE_PAGE_SIZE,
    productType: config.productType,
  });

  const [{ fragrances, total }, options] = await Promise.all([
    getFragrances(filters),
    getFilterOptions(brandSlug, config.productType),
  ]);

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      {showHeader && (
        <header className="mb-6">
          <h1 className="font-playfair text-2xl sm:text-3xl text-espresso">{config.label}</h1>
          <p className="mt-1 text-sm text-mocha max-w-2xl">{config.description}</p>
        </header>
      )}

      <div className="flex-1">
        <Suspense>
          <ProductToolbar
            total={total}
            brandSlug={brandSlug}
            brands={options.brands}
            series={options.series}
            bottleSizes={options.bottleSizes}
            catalogPath={config.path}
            perfumeFilters={config.perfumeFilters}
          />
        </Suspense>
        <Suspense>
          <ActiveFilters brandSlug={brandSlug} catalogPath={config.path} />
        </Suspense>
        <Suspense>
          <InfiniteFragranceGrid
            initialFragrances={fragrances}
            total={total}
            pageSize={FRAGRANCE_PAGE_SIZE}
            brandSlug={brandSlug}
            productType={config.productType}
            catalogPath={config.path}
            emptyMessage={config.emptyMessage}
          />
        </Suspense>
      </div>
    </div>
  );
}
