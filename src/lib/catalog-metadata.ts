import type { Metadata } from "next";
import { getCatalog, type CatalogSlug } from "@/lib/product-catalog";
import { absoluteUrl, defaultOgImage, SEO } from "@/lib/seo";

export function buildCatalogMetadata(catalog: CatalogSlug): Metadata {
  const config = getCatalog(catalog);
  const url = absoluteUrl(config.path);
  const og = defaultOgImage();

  return {
    title: config.title,
    description: config.description,
    keywords: [...SEO.keywords, config.label.toLowerCase(), `shop ${config.label.toLowerCase()}`],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${config.title} | COSY AURA`,
      description: config.description,
      url,
      siteName: "COSY AURA",
      images: [og],
    },
    twitter: {
      card: "summary_large_image",
      title: `${config.title} | COSY AURA`,
      description: config.description,
      images: [og.url],
    },
  };
}
