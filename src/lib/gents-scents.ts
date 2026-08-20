import "server-only";

import { prisma } from "@/lib/prisma";
import {
  GENTS_SCENTS_CHANNEL,
  type GentsScentsVideoReview,
  type VideoReviewPerfume,
} from "@/lib/gents-scents-shared";

export type { GentsScentsVideoReview, VideoReviewPerfume };
export { GENTS_SCENTS_CHANNEL };

const CHANNEL_ID =
  process.env.GENTS_SCENTS_CHANNEL_ID || "UC9IImcLkUdmURWtQhxu8VwQ";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

type CatalogHit = { model: string; slug: string; brand: string };

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 60) return minutes <= 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

function featuredBlock(description: string): string {
  const match = description.match(
    /FRAGRANCES FEATURED:([\s\S]*?)(?:\n\s*\n|🌊|🚨|💥|Social Media)/i
  );
  return match ? match[1] : description.slice(0, 600);
}

function matchPerfumes(title: string, description: string, catalog: CatalogHit[]) {
  const featured = featuredBlock(description);
  const haystacks = [title, featured, description].map((s) => s.toLowerCase());
  const sorted = [...catalog].sort((a, b) => b.model.length - a.model.length);
  const hits: VideoReviewPerfume[] = [];
  const seen = new Set<string>();

  for (const item of sorted) {
    const needle = item.model.toLowerCase().trim();
    if (needle.length < 4) continue;
    if (!haystacks.some((hay) => hay.includes(needle))) continue;
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    hits.push({
      name: `${item.brand} ${item.model}`,
      href: `/fragrances/${item.slug}`,
    });
    if (hits.length >= 6) break;
  }
  return hits;
}

export async function getGentsScentsVideoReviews(
  limit = 6
): Promise<GentsScentsVideoReview[]> {
  try {
    const [feedRes, catalog] = await Promise.all([
      fetch(FEED_URL, {
        headers: { Accept: "application/atom+xml" },
        next: { revalidate: 3600 },
      }),
      prisma.fragrance.findMany({
        select: {
          slug: true,
          model: true,
          brand: { select: { name: true } },
        },
      }),
    ]);

    if (!feedRes.ok) return [];
    const xml = await feedRes.text();
    const entries = xml.split("<entry>").slice(1);
    const catalogHits: CatalogHit[] = catalog.map((row) => ({
      slug: row.slug,
      model: row.model,
      brand: row.brand.name,
    }));

    return entries.slice(0, limit).map((entry) => {
      const youtubeId = tag(entry, "yt:videoId");
      const title = tag(entry, "title") || "Fragrance review";
      const publishedAt = tag(entry, "published");
      const description = tag(entry, "media:description");
      return {
        id: youtubeId,
        username: GENTS_SCENTS_CHANNEL.name,
        timeAgo: relativeTime(publishedAt),
        youtubeId,
        title,
        thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        publishedAt,
        channelUrl: GENTS_SCENTS_CHANNEL.url,
        perfumes: matchPerfumes(title, description, catalogHits),
      };
    }).filter((video) => video.youtubeId);
  } catch (error) {
    console.error("[gents-scents]", error);
    return [];
  }
}
