import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import {
  extractBlogToc,
  formatBlogDate,
  getPublishedPostBySlug,
} from "@/lib/blog";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

function stripLeadingCoverImage(content: string, coverImage: string | null) {
  if (!coverImage) return content;
  const escaped = coverImage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.replace(
    new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)\\s*`, "m"),
    ""
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) return { title: "Journal" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) notFound();

  const date = formatBlogDate(post.publishedAt || post.createdAt);
  const toc = extractBlogToc(post.content);
  const bodyContent = stripLeadingCoverImage(post.content, post.coverImage);

  return (
    <article className="bg-[#ececec] min-h-screen">
      <header className="bg-wf-black text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-[0.25em] text-gold hover:text-gold-light"
          >
            The Journal
          </Link>
          <h1 className="font-playfair text-3xl md:text-5xl text-white mt-4 mb-4 leading-tight max-w-4xl">
            {post.title}
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed mb-4 max-w-3xl">
            {post.excerpt}
          </p>
          <p className="text-sm text-white/55">
            {date}
            {post.authorName ? ` · ${post.authorName}` : ""}
          </p>
        </div>
      </header>

      {post.coverImage && (
        <div className="max-w-6xl mx-auto px-4 pt-8 md:pt-10">
          <div className="relative aspect-[21/9] md:aspect-[2.4/1] overflow-hidden bg-white border border-black/10">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              className="object-contain p-4 md:p-8"
              sizes="(max-width: 1280px) 100vw, 1152px"
            />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
          {toc.length > 0 && (
            <aside className="lg:sticky lg:top-24 order-2 lg:order-1">
              <nav
                aria-label="Table of contents"
                className="bg-white border border-black/10 p-5"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3">
                  Contents
                </p>
                <ol className="space-y-2.5 text-sm">
                  {toc.map((item, index) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-wf-gray hover:text-gold leading-snug transition-colors"
                      >
                        <span className="text-wf-black/40 mr-2 tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}

          <div className="order-1 lg:order-2">
            <div className="bg-white border border-black/10 px-5 py-8 sm:px-10 sm:py-12">
              <BlogMarkdown content={bodyContent} />
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/blog" className="btn-outline bg-white">
                Back to Journal
              </Link>
              <Link href="/fragrances" className="btn-gold">
                Shop Fragrances
              </Link>
              <Link href="/fragrances" className="btn-outline bg-white">
                Browse Collection
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
