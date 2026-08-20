import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { ActiveFilters } from "@/components/products/FilterSidebar";
import { InfiniteFragranceGrid } from "@/components/products/InfiniteFragranceGrid";
import { ProductToolbar } from "@/components/products/ProductToolbar";
import { ProductPurchase } from "@/components/products/ProductPurchase";
import { ScentLayeringGuide } from "@/components/perfume/ScentLayeringGuide";
import { DiscoverySetBuilder } from "@/components/perfume/DiscoverySetBuilder";
import {
  getFragranceBySlug,
  getRelatedFragrances,
  getSuggestedFragrances,
  getFragrances,
  getBrandBySlug,
  getAllFragranceSlugs,
  getAllBrands,
  getFilterOptions,
  parseFragranceListFilters,
  FRAGRANCE_PAGE_SIZE,
} from "@/lib/fragrances";
import type { Metadata } from "next";
import {
  absoluteUrl,
  buildFragranceProductJsonLd,
  defaultOgImage,
  SEO,
} from "@/lib/seo";
import { concentrationLabel, fragranceFamilyLabel } from "@/lib/utils";
import { salePriceForSize } from "@/lib/pricing";

export const revalidate = 300;

interface PageProps {
  params: { slug: string };
  searchParams: Record<string, string | undefined>;
}

export async function generateStaticParams() {
  try {
    const [fragranceSlugs, brands] = await Promise.all([
      getAllFragranceSlugs(),
      getAllBrands(),
    ]);
    return [
      ...fragranceSlugs.map((f) => ({ slug: f.slug })),
      ...brands.map((b) => ({ slug: b.slug })),
    ];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);
  if (brand) {
    const title = `${brand.name} Luxury Perfumes & Artisan Fragrances`;
    const description = `Shop ${brand.name} oil-based perfume oils at COSY AURA - sustainable, vegan-friendly, alcohol-free artisan scents inspired by Grasse.`;
    const og = defaultOgImage();
    return {
      title,
      description,
      keywords: [...SEO.keywords, brand.name, `${brand.name} perfume`],
      alternates: { canonical: absoluteUrl(`/fragrances/${brand.slug}`) },
      openGraph: {
        type: "website",
        title,
        description,
        url: absoluteUrl(`/fragrances/${brand.slug}`),
        siteName: "COSY AURA",
        images: [og],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [og.url],
      },
    };
  }

  const fragrance = await getFragranceBySlug(params.slug);
  if (!fragrance) return { title: "Not Found" };

  const title = `${fragrance.brand.name} ${fragrance.model} | Luxury Perfume`;
  const description = fragrance.description.slice(0, 160);
  const primaryImage = fragrance.images[0]?.url;
  const url = absoluteUrl(`/fragrances/${fragrance.slug}`);
  const ogImage = primaryImage
    ? {
        url: primaryImage.startsWith("http")
          ? primaryImage
          : absoluteUrl(primaryImage),
        width: 800,
        height: 800,
        alt: `${fragrance.brand.name} ${fragrance.model}`,
      }
    : defaultOgImage();

  return {
    title,
    description,
    keywords: [
      ...SEO.keywords,
      fragrance.brand.name,
      fragrance.model,
      fragranceFamilyLabel(fragrance.fragranceFamily),
      concentrationLabel(fragrance.concentration),
    ],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${fragrance.brand.name} ${fragrance.model}`,
      description,
      url,
      siteName: "COSY AURA",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${fragrance.brand.name} ${fragrance.model}`,
      description,
      images: [ogImage.url],
    },
  };
}

async function BrandListing({
  brandSlug,
  searchParams,
}: {
  brandSlug: string;
  searchParams: Record<string, string | undefined>;
}) {
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const filters = parseFragranceListFilters(searchParams, {
    brandSlug,
    page: 1,
    limit: FRAGRANCE_PAGE_SIZE,
  });

  const [{ fragrances, total }, options] = await Promise.all([
    getFragrances(filters),
    getFilterOptions(brandSlug),
  ]);

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6">
      <Suspense>
        <ProductToolbar
          total={total}
          brandSlug={brandSlug}
          brands={options.brands}
          series={options.series}
          bottleSizes={options.bottleSizes}
        />
      </Suspense>
      <Suspense>
        <ActiveFilters brandSlug={brandSlug} />
      </Suspense>

      <Suspense>
        <InfiniteFragranceGrid
          initialFragrances={fragrances}
          total={total}
          pageSize={FRAGRANCE_PAGE_SIZE}
          brandSlug={brandSlug}
          emptyMessage={`No ${brand.name} fragrances found.`}
        />
      </Suspense>
    </div>
  );
}

type FragranceDetailData = NonNullable<Awaited<ReturnType<typeof getFragranceBySlug>>>;

function FragranceDetailExtrasFallback() {
  return (
    <div className="mt-12 space-y-12" aria-hidden="true">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="skeleton h-64 rounded" />
        <div className="skeleton h-64 rounded" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-72 w-40 shrink-0 rounded" />
        ))}
      </div>
    </div>
  );
}

async function FragranceDetailExtras({
  fragrance,
}: {
  fragrance: FragranceDetailData;
}) {
  const [related, suggested] = await Promise.all([
    getRelatedFragrances(fragrance.id, fragrance.brandId),
    getSuggestedFragrances(fragrance.id),
  ]);

  const sampleOptions = [fragrance, ...related].map((f) => ({
    id: f.id,
    slug: f.slug,
    model: f.model,
    brand: f.brand,
    price: f.price,
    images: f.images,
    sampleAvailable: f.sampleAvailable,
  }));

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
        <ScentLayeringGuide
          base={{
            id: fragrance.id,
            slug: fragrance.slug,
            model: fragrance.model,
            price: fragrance.price,
            fragranceFamily: fragrance.fragranceFamily,
            brand: fragrance.brand,
            images: fragrance.images,
          }}
          partners={related.map((f) => ({
            id: f.id,
            slug: f.slug,
            model: f.model,
            price: f.price,
            fragranceFamily: f.fragranceFamily,
            brand: f.brand,
            images: f.images,
          }))}
        />
        <DiscoverySetBuilder options={sampleOptions} />
      </div>

      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-cormorant text-[15px] tracking-[0.04em]">
        <a href="/atelier" className="text-gold hover:text-gold-light transition-colors">
          Perfume Atelier →
        </a>
        <a href="/behind-the-bottle" className="text-gold hover:text-gold-light transition-colors">
          Behind the Bottle →
        </a>
        <a href="/subscribe" className="text-gold hover:text-gold-light transition-colors">
          Monthly discovery sets →
        </a>
      </div>

      <ProductCarousel fragrances={suggested} />
    </>
  );
}

async function FragranceDetail({ slug }: { slug: string }) {
  const fragrance = await getFragranceBySlug(slug);
  if (!fragrance) notFound();

  const jsonLd = buildFragranceProductJsonLd({
    name: `${fragrance.brand.name} ${fragrance.model}`,
    description: fragrance.description,
    sku: fragrance.reference,
    brand: fragrance.brand.name,
    images: fragrance.images.map((img) => img.url),
    price: salePriceForSize(50, fragrance.slug),
    currency: "GHS",
    url: `/fragrances/${fragrance.slug}`,
    availability: (fragrance.stock ?? 1) > 0 ? "InStock" : "OutOfStock",
    category: fragrance.category,
    rating: fragrance.rating,
    fragranceFamily: fragranceFamilyLabel(fragrance.fragranceFamily),
    concentration: concentrationLabel(fragrance.concentration),
    bottleSize: fragrance.bottleSize,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ProductPurchase fragrance={fragrance} />

        <Suspense fallback={<FragranceDetailExtrasFallback />}>
          <FragranceDetailExtras fragrance={fragrance} />
        </Suspense>
      </div>
    </>
  );
}

export default async function FragranceSlugPage({ params, searchParams }: PageProps) {
  const brand = await getBrandBySlug(params.slug);
  if (brand) {
    return <BrandListing brandSlug={params.slug} searchParams={searchParams} />;
  }

  return <FragranceDetail slug={params.slug} />;
}
