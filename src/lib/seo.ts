/** Sitewide SEO helpers for Cosy Aura perfume storefront */

/** Legal / brand name - used in JSON-LD and title suffixes */
export const SITE_NAME = "COSY AURA";

/** Public marketing site name (Vercel: NEXT_PUBLIC_SITE_NAME) */
export const PUBLIC_SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Luxury Perfumes";

export function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://cosyaura.com";
  return raw.replace(/\/$/, "");
}

const DEFAULT_DESCRIPTION =
  "Discover handcrafted oil-based perfumes using rare ingredients. Sustainable, vegan, alcohol-free luxury fragrance oils crafted in France.";

export const SEO = {
  title: `${PUBLIC_SITE_NAME} | Artisan Fragrances from Grasse | ${SITE_NAME}`,
  titleTemplate: `%s | ${SITE_NAME}`,
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() || DEFAULT_DESCRIPTION,
  keywords: [
    "oil based perfume",
    "perfume oil",
    "luxury perfume oil",
    "artisan fragrance",
    "alcohol free perfume",
    "niche perfume oil",
    "Grasse",
    "sustainable perfume",
    "vegan fragrance",
    "French perfume oil",
  ],
  ogImagePath: "/images/og-perfume.png",
  locale: "en_US",
  twitterHandle: "@cosyaura",
} as const;

export function absoluteUrl(path = "/") {
  const base = siteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function defaultOgImage() {
  return {
    url: absoluteUrl(SEO.ogImagePath),
    width: 1200,
    height: 630,
    alt: "COSY AURA - Luxury oil-based artisan perfumes from Grasse",
  };
}

export type ProductJsonLdInput = {
  name: string;
  description: string;
  sku: string;
  brand: string;
  images: string[];
  price: number;
  currency?: string;
  url: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  condition?: "NewCondition" | "UsedCondition";
  category?: string | null;
  rating?: number | null;
  reviewCount?: number;
  fragranceFamily?: string | null;
  concentration?: string | null;
  bottleSize?: number | null;
};

/** Product JSON-LD for fragrance PDP */
export function buildFragranceProductJsonLd(input: ProductJsonLdInput) {
  const images = input.images
    .map((src) => (src.startsWith("http") ? src : absoluteUrl(src)))
    .filter(Boolean);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    sku: input.sku,
    mpn: input.sku,
    brand: {
      "@type": "Brand",
      name: input.brand,
    },
    image: images.length ? images : [defaultOgImage().url],
    url: input.url.startsWith("http") ? input.url : absoluteUrl(input.url),
    category: input.category || "Perfume",
    material: "Fragrance",
    additionalProperty: [
      input.fragranceFamily
        ? {
            "@type": "PropertyValue",
            name: "Fragrance Family",
            value: input.fragranceFamily,
          }
        : null,
      input.concentration
        ? {
            "@type": "PropertyValue",
            name: "Concentration",
            value: input.concentration,
          }
        : null,
      input.bottleSize
        ? {
            "@type": "PropertyValue",
            name: "Bottle Size",
            value: `${input.bottleSize} ml`,
          }
        : null,
    ].filter(Boolean),
    offers: {
      "@type": "Offer",
      url: input.url.startsWith("http") ? input.url : absoluteUrl(input.url),
      priceCurrency: input.currency || "GHS",
      price: Number(input.price).toFixed(2),
      availability: `https://schema.org/${input.availability || "InStock"}`,
      itemCondition: `https://schema.org/${input.condition || "NewCondition"}`,
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: siteUrl(),
      },
    },
  };

  if (input.rating != null && input.rating > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      reviewCount: String(input.reviewCount ?? 1),
    };
  }

  return jsonLd;
}

/** Organization + WebSite JSON-LD for homepage / layout */
export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl(),
    logo: absoluteUrl("/apple-icon.png"),
    description: SEO.description,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@cosyaura.com",
      availableLanguage: ["English"],
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "GH",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/ReturnShippingFees",
      merchantReturnLink: absoluteUrl("/returns"),
    },
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl(),
    description: SEO.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl()}/fragrances?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
