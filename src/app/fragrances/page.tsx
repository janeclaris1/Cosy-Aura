import { Suspense } from "react";
import type { Metadata } from "next";
import { ActiveFilters } from "@/components/products/FilterSidebar";
import { InfiniteFragranceGrid } from "@/components/products/InfiniteFragranceGrid";
import { ProductToolbar } from "@/components/products/ProductToolbar";
import {
  getFilterOptions,
  getFragrances,
  parseFragranceListFilters,
  FRAGRANCE_PAGE_SIZE,
} from "@/lib/fragrances";
import { absoluteUrl, defaultOgImage, SEO } from "@/lib/seo";

export const revalidate = 300;

const title = "Shop Luxury Perfumes & Artisan Fragrances";
const description =
  "Browse handcrafted oil-based perfume oils - sustainable, vegan, alcohol-free options inspired by Grasse. Secure checkout at COSY AURA.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [...SEO.keywords, "shop perfume oil", "buy oil based perfume"],
  alternates: { canonical: absoluteUrl("/fragrances") },
  openGraph: {
    type: "website",
    title: `${title} | COSY AURA`,
    description,
    url: absoluteUrl("/fragrances"),
    siteName: "COSY AURA",
    images: [defaultOgImage()],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | COSY AURA`,
    description,
    images: [defaultOgImage().url],
  },
};

interface PageProps {
  searchParams: Record<string, string | undefined>;
}

export default async function FragrancesPage({ searchParams }: PageProps) {
  const filters = parseFragranceListFilters(searchParams, {
    page: 1,
    limit: FRAGRANCE_PAGE_SIZE,
  });
  const [{ fragrances, total }, options] = await Promise.all([
    getFragrances(filters),
    getFilterOptions(filters.brandSlug),
  ]);

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <div className="flex-1">
        <Suspense>
          <ProductToolbar
            total={total}
            brands={options.brands}
            series={options.series}
            bottleSizes={options.bottleSizes}
          />
        </Suspense>
        <Suspense>
          <ActiveFilters />
        </Suspense>
        <Suspense>
          <InfiniteFragranceGrid
            initialFragrances={fragrances}
            total={total}
            pageSize={FRAGRANCE_PAGE_SIZE}
          />
        </Suspense>
      </div>
    </div>
  );
}
