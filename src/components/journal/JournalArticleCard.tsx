import type { JournalPostPreview } from "@/lib/blog";
import { JournalMagazineCard } from "@/components/journal/JournalMagazineCard";

export function JournalArticleCard({ post }: { post: JournalPostPreview }) {
  return (
    <JournalMagazineCard
      href={`/blog/${post.slug}`}
      image={post.coverImage}
      title={post.title}
      cta="Read more"
    />
  );
}
