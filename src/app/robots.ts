import { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/feeds/"],
        disallow: ["/admin/", "/api/", "/checkout/", "/account/"],
      },
      {
        userAgent: "Algolia Crawler",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "Algolia",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
