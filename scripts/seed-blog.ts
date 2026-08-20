import { PrismaClient } from "@prisma/client";
import { blogArticles } from "./blog-articles";

const prisma = new PrismaClient();

type SeedPost = {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  daysAgo: number;
};

const posts: SeedPost[] = [
  {
    title: "Feature: These 5 Rolex Models Still Feel Within Reach",
    slug: "feature-five-rolex-models-within-reach",
    excerpt:
      "Not every Rolex conversation starts at six figures. Here are five model directions that still make sense for a first serious steel piece.",
    coverImage: "/images/watches/rolex/426868.jpg",
    daysAgo: 2,
  },
  {
    title: "Guide: How to Choose Your First Luxury Watch",
    slug: "how-to-choose-your-first-luxury-watch",
    excerpt:
      "A practical path through lifestyle, case size, movement, and brand character when you are ready for your first serious timepiece.",
    coverImage: "/images/watches/tudor/356813.jpg",
    daysAgo: 4,
  },
  {
    title: "Feature: Box and Papers Still Matter",
    slug: "box-and-papers-what-collectors-look-for",
    excerpt:
      "Why original packaging and documentation still shape confidence, provenance, and long-term ownership.",
    coverImage: "/images/watches/omega/421482.jpg",
    daysAgo: 6,
  },
  {
    title: "Opinion: Why Steel Sports Watches Still Rule Daily Wear",
    slug: "steel-sports-watches-daily-wear",
    excerpt:
      "From dive icons to pilot tool watches, steel sports pieces remain the easiest luxury watches to live with every day.",
    coverImage: "/images/watches/tudor/368832.jpg",
    daysAgo: 8,
  },
  {
    title: "Guide: Omega Speedmaster Buying Notes",
    slug: "guide-omega-speedmaster-buying-notes",
    excerpt:
      "What to verify on dial variants, case wear, crystals, and documentation before you commit to a Moonwatch-family chronograph.",
    coverImage: "/images/watches/omega/421482.jpg",
    daysAgo: 10,
  },
  {
    title: "Feature: Breitling Navitimer for Modern Wrists",
    slug: "feature-breitling-navitimer-modern-wrists",
    excerpt:
      "Aviation heritage meets everyday presence. How to pick a Navitimer that wears balanced rather than oversized.",
    coverImage: "/images/watches/breitling/415898.jpg",
    daysAgo: 12,
  },
  {
    title: "Guide: Reading Case Size Without Guesswork",
    slug: "guide-reading-case-size-without-guesswork",
    excerpt:
      "Diameter is only part of the story. Lug-to-lug, thickness, and strap width change how a watch actually sits.",
    coverImage: "/images/watches/tudor/356813.jpg",
    daysAgo: 14,
  },
  {
    title: "Feature: Tudor Black Bay as a First Dive Watch",
    slug: "feature-tudor-black-bay-first-dive-watch",
    excerpt:
      "Heritage looks, modern reliability, and a clear first-tool-watch brief. Why Black Bay remains a favorite gateway dive watch.",
    coverImage: "/images/watches/tudor/368832.jpg",
    daysAgo: 16,
  },
  {
    title: "Opinion: Automatic vs Quartz in 2026",
    slug: "opinion-automatic-vs-quartz-2026",
    excerpt:
      "Romance versus precision. When each movement type is the better choice for a modern collection.",
    coverImage: "/images/watches/rolex/426868.jpg",
    daysAgo: 18,
  },
  {
    title: "Guide: Building a Three-Watch Collection",
    slug: "guide-building-three-watch-collection",
    excerpt:
      "Daily steel, evening dress, and one character piece. A simple framework that still works.",
    coverImage: "/images/watches/watchesofswitzerland/cartier/17311442/1.jpg",
    daysAgo: 20,
  },
  {
    title: "Feature: Cartier Tank and Soft Power Style",
    slug: "feature-cartier-tank-soft-power-style",
    excerpt:
      "Rectangular elegance that reads refined rather than loud. Why the Tank remains a style essential.",
    coverImage: "/images/watches/watchesofswitzerland/cartier/17311442/1.jpg",
    daysAgo: 22,
  },
  {
    title: "Guide: What New Condition Really Means",
    slug: "guide-what-new-condition-really-means",
    excerpt:
      "How to read condition labels, photos, and completeness notes when you shop new luxury watches online.",
    coverImage: "/images/watches/rolex/426868.jpg",
    daysAgo: 24,
  },
  {
    title: "Feature: Hublot Bold Design Without Apology",
    slug: "feature-hublot-bold-design-without-apology",
    excerpt:
      "Material mixes, sculpted cases, and statement dials. How to approach Hublot if you want presence.",
    coverImage: "/images/watches/hublot/329721.jpg",
    daysAgo: 26,
  },
  {
    title: "Guide: Dial Color and Everyday Versatility",
    slug: "guide-dial-color-everyday-versatility",
    excerpt:
      "Black and blue still win for daily rotation. When white, green, or champagne make more sense.",
    coverImage: "/images/watches/omega/429128.jpg",
    daysAgo: 28,
  },
  {
    title: "Opinion: Bracelets Beat Straps for Travel",
    slug: "opinion-bracelets-beat-straps-for-travel",
    excerpt:
      "Metal bracelets survive humidity, airports, and long days better than most leather straps.",
    coverImage: "/images/watches/rolex/426868.jpg",
    daysAgo: 30,
  },
  {
    title: "Feature: IWC Pilot Watches for Clear Legibility",
    slug: "feature-iwc-pilot-watches-clear-legibility",
    excerpt:
      "Aviation-inspired dials built around instant readability. Why Pilot remains a strong daily candidate.",
    coverImage: "/images/watches/iwc/375421.jpg",
    daysAgo: 32,
  },
  {
    title: "Guide: Shipping and Delivery Expectations",
    slug: "guide-shipping-and-delivery-expectations",
    excerpt:
      "What happens after you pay, how tracking works, and how to read delivery windows with confidence.",
    coverImage: "/images/watches/breitling/415898.jpg",
    daysAgo: 34,
  },
  {
    title: "Feature: Panerai Presence on Larger Wrists",
    slug: "feature-panerai-presence-larger-wrists",
    excerpt:
      "Cushion cases and luminous dials built for presence. How to choose a Panerai that still wears balanced.",
    coverImage: "/images/watches/panerai/413168.jpg",
    daysAgo: 36,
  },
  {
    title: "Guide: Returns Without Stress",
    slug: "guide-returns-without-stress",
    excerpt:
      "A clear look at the 14-day returns window and how to keep a piece eligible if you change your mind.",
    coverImage: "/images/watches/tudor/377030.jpg",
    daysAgo: 38,
  },
  {
    title: "Opinion: Gold Accents Without Going Full Dress",
    slug: "opinion-gold-accents-without-full-dress",
    excerpt:
      "Two-tone and warm indices can elevate a sports watch without forcing a formal wardrobe.",
    coverImage: "/images/watches/wristaficionado/P0596S.jpg",
    daysAgo: 40,
  },
  {
    title: "Feature: Grand Seiko Texture Worth Studying",
    slug: "feature-grand-seiko-texture-worth-studying",
    excerpt:
      "Dial finishing and light play reward close looking. Why Grand Seiko converts people who study craft.",
    coverImage: "/images/watches/grand-seiko/386951.jpg",
    daysAgo: 42,
  },
  {
    title: "Guide: Budget Bands That Still Feel Luxurious",
    slug: "guide-budget-bands-that-feel-luxurious",
    excerpt:
      "How to shop under $500, between $500 and $999, and above $1,000 without compromising taste.",
    coverImage: "/images/watches/citizen/AW1780-25A/1.jpg",
    daysAgo: 44,
  },
  {
    title: "Feature: TAG Heuer Sport Chronograph Energy",
    slug: "feature-tag-heuer-sport-chronograph-energy",
    excerpt:
      "Racing DNA, pushers, and tachymeter scales. When a chronograph is the right everyday personality piece.",
    coverImage: "/images/watches/tag-heuer/425658.jpg",
    daysAgo: 46,
  },
  {
    title: "Guide: Asking Better Questions Before Checkout",
    slug: "guide-asking-better-questions-before-checkout",
    excerpt:
      "Reference confirmation, wrist fit, completeness, and delivery timing. A checklist for confident buying.",
    coverImage: "/images/watches/iwc/375421.jpg",
    daysAgo: 48,
  },
  {
    title: "Guide: Rolex Gold and Silver Watches for Women",
    slug: "rolex-gold-and-silver-watches-for-women",
    excerpt:
      "How to choose between gold, silver-tone steel, and two-tone Rolesor Rolex watches for women—plus sizes, bracelets, and a practical buying checklist.",
    coverImage: "/images/watches/wristaficionado/P0596S.jpg",
    daysAgo: 0,
  },
];

async function main() {
  if (posts.length < 24) {
    throw new Error(`Expected at least 24 posts, got ${posts.length}`);
  }

  for (const post of posts) {
    const content = blogArticles[post.slug];
    if (!content?.trim()) {
      throw new Error(`Missing full article for slug: ${post.slug}`);
    }

    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - post.daysAgo);

    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content,
        coverImage: post.coverImage,
        authorName: "COSY AURA",
        published: true,
        publishedAt,
      },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content,
        coverImage: post.coverImage,
        authorName: "COSY AURA",
        published: true,
        publishedAt,
      },
    });
    console.log(`Upserted full article: ${post.slug} (${content.length} chars)`);
  }

  console.log(`Done. ${posts.length} full journal articles ready.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
