import { SEO, absoluteUrl, defaultOgImage, siteUrl } from "@/lib/seo";
import type { Metadata } from "next";

/** Root / shared metadata for the perfume storefront */
export function buildRootMetadata(): Metadata {
  const og = defaultOgImage();

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: SEO.title,
      template: SEO.titleTemplate,
    },
    description: SEO.description,
    keywords: [...SEO.keywords],
    authors: [{ name: "COSY AURA" }],
    creator: "COSY AURA",
    publisher: "COSY AURA",
    alternates: {
      canonical: absoluteUrl("/"),
    },
    openGraph: {
      type: "website",
      locale: SEO.locale,
      url: absoluteUrl("/"),
      siteName: "COSY AURA",
      title: SEO.title,
      description: SEO.description,
      images: [og],
    },
    twitter: {
      card: "summary_large_image",
      title: SEO.title,
      description: SEO.description,
      images: [og.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      title: "Cosy Aura",
      statusBarStyle: "black-translucent",
    },
    other: {
      "algolia-site-verification": "163E676A1222ACC2",
      "google-site-verification": "_SPtOEkK2AipTYoZRjFj4R4QyFohXr8oq8tsposOpx4",
      "mobile-web-app-capable": "yes",
    },
  };
}
