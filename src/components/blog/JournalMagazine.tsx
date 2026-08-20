"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Flower2 } from "lucide-react";
import { JournalArticleCard } from "@/components/journal/JournalArticleCard";
import { ScentTalkCard } from "@/components/journal/ScentTalkCard";
import { ScentTalkPlayer } from "@/components/journal/ScentTalkPlayer";
import type { JournalPostPreview } from "@/lib/blog";
import { SCENT_TALKS, type ScentTalk } from "@/lib/scent-talks";
import { cn } from "@/lib/utils";

type Filter = "all" | "article" | "video" | "podcast";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "article", label: "Articles" },
  { id: "video", label: "Video" },
  { id: "podcast", label: "Podcast" },
];

type FeedItem =
  | { type: "talk"; talk: ScentTalk }
  | { type: "article"; post: JournalPostPreview };

function interleave(talks: ScentTalk[], posts: JournalPostPreview[]): FeedItem[] {
  const items: FeedItem[] = [];
  const max = Math.max(talks.length, posts.length);
  for (let i = 0; i < max; i += 1) {
    if (talks[i]) items.push({ type: "talk", talk: talks[i] });
    if (posts[i]) items.push({ type: "article", post: posts[i] });
  }
  return items;
}

export function JournalMagazine({ posts }: { posts: JournalPostPreview[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<ScentTalk | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const talks = SCENT_TALKS.filter((talk) => {
      if (filter === "article") return false;
      if (filter === "video" && talk.kind !== "video") return false;
      if (filter === "podcast" && talk.kind !== "podcast") return false;
      if (!q) return true;
      return (
        talk.guest.toLowerCase().includes(q) ||
        talk.title.toLowerCase().includes(q) ||
        talk.kind.includes(q)
      );
    });
    const articles = posts.filter((post) => {
      if (filter === "video" || filter === "podcast") return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q)
      );
    });
    return interleave(talks, articles);
  }, [posts, query, filter]);

  return (
    <div className="bg-white min-h-screen">
      <section className="relative bg-wf-black text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-y-0 right-0 w-full md:w-[52%]">
            <Image
              src="/images/hero/zino.jpg"
              alt=""
              fill
              priority
              className="object-cover object-center opacity-90"
              sizes="(max-width: 768px) 100vw, 52vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-wf-black via-wf-black/85 to-wf-black/25 md:via-wf-black/55 md:to-transparent" />
          </div>
        </div>

        <div className="relative max-w-[1500px] mx-auto px-4 py-14 md:py-20 lg:py-24">
          <div className="max-w-xl">
            <p className="font-cantora text-5xl sm:text-6xl md:text-7xl tracking-tight leading-none">
              CA
            </p>
            <p className="mt-2 text-xs sm:text-sm uppercase tracking-[0.35em] text-white/80">
              The Fragrance Journal
            </p>
            <h1 className="mt-8 font-playfair text-2xl sm:text-3xl md:text-4xl text-gold leading-snug">
              Guides, Scent Talk, and the notes worth keeping.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/75 leading-relaxed max-w-md">
              Written pieces beside video and podcast journals - how to wear
              oils, what to sample, and conversations with our hosts.
            </p>

            <label className="mt-8 flex items-center gap-3 max-w-sm">
              <span className="inline-flex items-center gap-1.5 text-sm text-white/90 shrink-0">
                Search
                <Flower2 className="w-4 h-4" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Article, guest, or episode"
                className="flex-1 bg-transparent border border-white/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-gold"
                aria-label="Search journal"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-10 md:py-16">
        <div className="flex flex-wrap gap-2 mb-10">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "text-[11px] uppercase tracking-[0.16em] px-4 py-2 border transition-colors",
                filter === item.id
                  ? "bg-espresso text-ivory border-espresso"
                  : "bg-white text-espresso border-black/10 hover:border-espresso/40"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-wf-gray py-16">
            Nothing matches your search.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12 md:gap-y-14">
            {filtered.map((item) =>
              item.type === "talk" ? (
                <ScentTalkCard
                  key={item.talk.id}
                  talk={item.talk}
                  onPlay={setActive}
                  magazine
                />
              ) : (
                <JournalArticleCard key={item.post.slug} post={item.post} />
              )
            )}
          </div>
        )}
      </div>
      </section>

      <ScentTalkPlayer talk={active} onClose={() => setActive(null)} />
    </div>
  );
}
