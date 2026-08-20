import { prisma } from "./prisma";
import { slugify } from "./utils";
import { JOURNAL_ARTICLES, getStaticArticleBySlug } from "./journal-articles";

const WATCH_JOURNAL_RE =
  /watch|rolex|omega|tudor|breitling|patek|navitimer|speedmaster|submariner|datejust|horolog/i;

export type JournalPostPreview = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  authorName: string;
  publishedAt: string | null;
};

export async function getJournalPostPreviews(): Promise<JournalPostPreview[]> {
  const db = await getPublishedPosts();
  const fromDb = db
    .filter(
      (post) => !WATCH_JOURNAL_RE.test(`${post.title} ${post.slug} ${post.excerpt}`)
    )
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      authorName: post.authorName,
      publishedAt: (post.publishedAt || post.createdAt).toISOString(),
    }));

  const seen = new Set(fromDb.map((post) => post.slug));
  const fromStatic = JOURNAL_ARTICLES.filter((article) => !seen.has(article.slug)).map(
    (article) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      authorName: article.authorName,
      publishedAt: article.publishedAt,
    })
  );

  return [...fromDb, ...fromStatic];
}

export async function getPublishedPosts() {
  try {
    return await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("[getPublishedPosts]", error);
    return [];
  }
}

export async function getPublishedPostBySlug(slug: string) {
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, published: true },
    });
    if (post) return post;
  } catch (error) {
    console.error("[getPublishedPostBySlug]", error);
  }

  const article = getStaticArticleBySlug(slug);
  if (!article) return null;
  const date = new Date(article.publishedAt);
  return {
    id: article.slug,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    coverImage: article.coverImage,
    authorName: article.authorName,
    published: true,
    publishedAt: date,
    createdAt: date,
    updatedAt: date,
  };
}

export async function getAllBlogPostsAdmin() {
  return prisma.blogPost.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getBlogPostById(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}

export async function ensureUniqueBlogSlug(titleOrSlug: string, excludeId?: string) {
  const base = slugify(titleOrSlug) || "post";
  let slug = base;
  let n = 2;

  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

export function formatBlogDate(date: Date | string | null | undefined) {
  if (!date) return null;
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return null;
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** DD/MM/YYYY for magazine-style journal cards */
export function formatBlogPostedOn(date: Date | string | null | undefined) {
  if (!date) return null;
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return null;
  const dd = String(value.getDate()).padStart(2, "0");
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const yyyy = value.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Pull H2 headings from markdown for an on-page table of contents. */
export function extractBlogToc(content: string): Array<{ id: string; label: string }> {
  const matches = Array.from(content.matchAll(/^##\s+(.+)$/gm));
  const items: Array<{ id: string; label: string }> = [];
  for (const match of matches) {
    const label = match[1].replace(/\*\*/g, "").trim();
    if (!label) continue;
    items.push({ id: slugify(label), label });
  }
  return items;
}
