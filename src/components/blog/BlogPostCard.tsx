import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@prisma/client";
import { formatBlogDate } from "@/lib/blog";

export function BlogPostCard({ post }: { post: BlogPost }) {
  const date = formatBlogDate(post.publishedAt || post.createdAt);

  return (
    <article className="group border-b border-wf-border pb-10 last:border-0">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.coverImage && (
          <div className="relative aspect-[16/9] mb-5 overflow-hidden bg-wf-light">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 700px"
            />
          </div>
        )}
        <p className="text-xs uppercase tracking-[0.18em] text-gold mb-2">
          {date || "Journal"}
          {post.authorName ? ` · ${post.authorName}` : ""}
        </p>
        <h2 className="font-playfair text-2xl md:text-3xl text-wf-black mb-3 group-hover:text-gold transition-colors">
          {post.title}
        </h2>
        <p className="text-wf-gray leading-relaxed text-[15px] max-w-2xl">
          {post.excerpt}
        </p>
        <span className="inline-block mt-4 text-sm text-gold group-hover:text-gold-light">
          Read more
        </span>
      </Link>
    </article>
  );
}
