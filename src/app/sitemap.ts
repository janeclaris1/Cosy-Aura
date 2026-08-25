import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { JOURNAL_ARTICLES } from "@/lib/journal-articles";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();

  const staticPages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }[] = [
    { path: "/fragrances", priority: 0.95, changeFrequency: "daily" },
    { path: "/fragrance-finder", priority: 0.85, changeFrequency: "weekly" },
    { path: "/atelier", priority: 0.8, changeFrequency: "weekly" },
    { path: "/gift-finder", priority: 0.75, changeFrequency: "weekly" },
    { path: "/occasions", priority: 0.7, changeFrequency: "weekly" },
    { path: "/seasonal-guide", priority: 0.7, changeFrequency: "monthly" },
    { path: "/collections", priority: 0.75, changeFrequency: "weekly" },
    { path: "/brands", priority: 0.8, changeFrequency: "weekly" },
    { path: "/subscribe", priority: 0.7, changeFrequency: "monthly" },
    { path: "/compare", priority: 0.55, changeFrequency: "monthly" },
    { path: "/scent-journal", priority: 0.55, changeFrequency: "monthly" },
    { path: "/scent-profile", priority: 0.55, changeFrequency: "monthly" },
    { path: "/ingredients", priority: 0.65, changeFrequency: "monthly" },
    { path: "/behind-the-bottle", priority: 0.65, changeFrequency: "monthly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/careers", priority: 0.4, changeFrequency: "monthly" },
    { path: "/press", priority: 0.4, changeFrequency: "monthly" },
    { path: "/sustainability", priority: 0.55, changeFrequency: "monthly" },
    { path: "/corporate-social-responsibility", priority: 0.5, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
    { path: "/shipping", priority: 0.5, changeFrequency: "monthly" },
    { path: "/returns", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/track", priority: 0.4, changeFrequency: "monthly" },
  ];

  try {
    const [fragrances, brands, posts] = await Promise.all([
      prisma.fragrance.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.brand.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.blogPost.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1,
      },
      ...staticPages.map((p) => ({
        url: `${baseUrl}${p.path}`,
        lastModified: new Date(),
        changeFrequency: p.changeFrequency,
        priority: p.priority,
      })),
      ...brands.map((b) => ({
        url: `${baseUrl}/fragrances/${b.slug}`,
        lastModified: b.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...fragrances.map((f) => ({
        url: `${baseUrl}/fragrances/${f.slug}`,
        lastModified: f.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      })),
      ...posts.map((p) => ({
        url: `${baseUrl}/blog/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...JOURNAL_ARTICLES.filter(
        (article) => !posts.some((p) => p.slug === article.slug)
      ).map((article) => ({
        url: `${baseUrl}/blog/${article.slug}`,
        lastModified: new Date(article.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1,
      },
      ...staticPages.map((p) => ({
        url: `${baseUrl}${p.path}`,
        lastModified: new Date(),
        changeFrequency: p.changeFrequency,
        priority: p.priority,
      })),
    ];
  }
}
