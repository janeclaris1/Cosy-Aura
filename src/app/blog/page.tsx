import type { Metadata } from "next";
import { JournalMagazine } from "@/components/blog/JournalMagazine";
import { getJournalPostPreviews } from "@/lib/blog";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Journal",
  description:
    "COSY AURA Fragrance Journal - articles, Scent Talk videos, and podcast episodes on oil-based perfume.",
};

export default async function BlogIndexPage() {
  const posts = await getJournalPostPreviews();
  return <JournalMagazine posts={posts} />;
}
