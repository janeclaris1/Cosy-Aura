/**
 * Push merged blogArticles + seed cover images into DB.
 * Preserves publishedAt for existing posts.
 */
import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import { blogArticles } from "./blog-articles";

const prisma = new PrismaClient();

const covers: Record<string, string> = {
  "feature-five-rolex-models-within-reach": "/images/watches/rolex/426868.jpg",
  "how-to-choose-your-first-luxury-watch": "/images/watches/tudor/356813.jpg",
  "box-and-papers-what-collectors-look-for": "/images/watches/omega/421482.jpg",
  "steel-sports-watches-daily-wear": "/images/watches/tudor/368832.jpg",
  "guide-omega-speedmaster-buying-notes": "/images/watches/omega/421482.jpg",
  "feature-breitling-navitimer-modern-wrists": "/images/watches/breitling/415898.jpg",
  "guide-reading-case-size-without-guesswork": "/images/watches/tudor/356813.jpg",
  "feature-tudor-black-bay-first-dive-watch": "/images/watches/tudor/368832.jpg",
  "opinion-automatic-vs-quartz-2026": "/images/watches/rolex/426868.jpg",
  "guide-building-three-watch-collection":
    "/images/watches/watchesofswitzerland/cartier/17311442/1.jpg",
  "feature-cartier-tank-soft-power-style":
    "/images/watches/watchesofswitzerland/cartier/17311442/1.jpg",
  "guide-what-new-condition-really-means": "/images/watches/rolex/426868.jpg",
  "feature-hublot-bold-design-without-apology": "/images/watches/hublot/329721.jpg",
  "guide-dial-color-everyday-versatility": "/images/watches/omega/429128.jpg",
  "opinion-bracelets-beat-straps-for-travel": "/images/watches/rolex/426868.jpg",
  "feature-iwc-pilot-watches-clear-legibility": "/images/watches/iwc/375421.jpg",
  "guide-shipping-and-delivery-expectations": "/images/watches/breitling/415898.jpg",
  "feature-panerai-presence-larger-wrists": "/images/watches/panerai/413168.jpg",
  "guide-returns-without-stress": "/images/watches/tudor/377030.jpg",
  "opinion-gold-accents-without-full-dress":
    "/images/watches/wristaficionado/P0596S.jpg",
  "feature-grand-seiko-texture-worth-studying":
    "/images/watches/grand-seiko/386951.jpg",
  "guide-budget-bands-that-feel-luxurious":
    "/images/watches/citizen/AW1780-25A/1.jpg",
  "feature-tag-heuer-sport-chronograph-energy":
    "/images/watches/tag-heuer/425658.jpg",
  "guide-asking-better-questions-before-checkout":
    "/images/watches/iwc/375421.jpg",
  "rolex-gold-and-silver-watches-for-women":
    "/images/watches/wristaficionado/P0596S.jpg",
};

const SKIP = new Set(["rolex-gold-and-silver-watches-for-women"]);

async function main() {
  let updated = 0;
  for (const [slug, content] of Object.entries(blogArticles)) {
    if (SKIP.has(slug)) {
      console.log(`skip (keep as-written): ${slug}`);
      continue;
    }
    const coverImage = covers[slug];
    const result = await prisma.blogPost.updateMany({
      where: { slug },
      data: {
        content,
        ...(coverImage ? { coverImage } : {}),
      },
    });
    console.log(`${slug}: ${result.count} row(s), ${content.length} chars`);
    updated += result.count;
  }
  console.log(`Done. Updated ${updated} posts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
