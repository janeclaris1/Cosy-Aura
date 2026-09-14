import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { ProductPurchase } from "@/components/products/ProductPurchase";
import { authOptions } from "@/lib/auth";
import { isGuestPriceHidden } from "@/lib/catalog-price-visibility";
import { getFragranceBySlug, getRelatedFragrances } from "@/lib/fragrances";
import { getCatalog, productDetailPath, type CatalogSlug } from "@/lib/product-catalog";
import { getStoreConfig } from "@/lib/store-config";
import { absoluteUrl, defaultOgImage, SEO } from "@/lib/seo";

export async function buildCatalogProductMetadata(
  catalog: CatalogSlug,
  slug: string
): Promise<Metadata> {
  const config = getCatalog(catalog);
  const fragrance = await getFragranceBySlug(slug);
  if (!fragrance || fragrance.productType !== config.productType) {
    return { title: "Not Found" };
  }

  const title = `${fragrance.brand.name} ${fragrance.model} | ${config.label}`;
  const description = fragrance.description.slice(0, 160);
  const url = absoluteUrl(productDetailPath(fragrance.productType, fragrance.slug));
  const primaryImage = fragrance.images[0]?.url;
  const ogImage = primaryImage
    ? {
        url: primaryImage.startsWith("http") ? primaryImage : absoluteUrl(primaryImage),
        width: 800,
        height: 800,
        alt: `${fragrance.brand.name} ${fragrance.model}`,
      }
    : defaultOgImage();

  return {
    title,
    description,
    keywords: [...SEO.keywords, fragrance.brand.name, fragrance.model, config.label],
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

export async function CatalogProductDetail({
  catalog,
  slug,
}: {
  catalog: CatalogSlug;
  slug: string;
}) {
  const config = getCatalog(catalog);
  const fragrance = await getFragranceBySlug(slug);
  if (!fragrance || fragrance.productType !== config.productType) notFound();

  const related = await getRelatedFragrances(
    fragrance.id,
    fragrance.brandId,
    12,
    fragrance.productType
  );

  const [session, storeConfig] = await Promise.all([
    getServerSession(authOptions),
    getStoreConfig(),
  ]);
  const hideGuestPrice = isGuestPriceHidden(
    fragrance.productType,
    storeConfig.guestHiddenPriceCatalogs,
    Boolean(session?.user?.id)
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${fragrance.brand.name} ${fragrance.model}`,
    description: fragrance.description,
    sku: fragrance.reference,
    brand: { "@type": "Brand", name: fragrance.brand.name },
    image: fragrance.images.map((img) => img.url),
    ...(hideGuestPrice
      ? {}
      : {
          offers: {
            "@type": "Offer",
            price: fragrance.price,
            priceCurrency: "GHS",
            availability:
              (fragrance.stock ?? 0) > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            url: absoluteUrl(productDetailPath(fragrance.productType, fragrance.slug)),
          },
        }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ProductPurchase fragrance={fragrance} />
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-playfair text-xl mb-4">More {config.label.toLowerCase()}</h2>
            <ProductCarousel fragrances={related} />
          </div>
        )}
      </div>
    </>
  );
}
