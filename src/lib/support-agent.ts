import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { isBottleSize } from "@/lib/bottle-sizes";
import {
  isInStockForCountry,
  resolveStockCountry,
  type CountryStockRow,
} from "@/lib/country-stock";
import { isHouseOriginal } from "@/lib/inspired-by";
import {
  SAMPLE_SIZE_ML,
  sampleSalePrice,
  salePriceForSize,
} from "@/lib/pricing";
import { getActiveShippingMethods } from "@/lib/shipping-methods";
import { formatPrice, fragranceFamilyLabel } from "@/lib/utils";
import type { SupportCartLine, SupportCartRemoval, SupportCartSnapshot } from "@/lib/support-types";

export type { SupportCartLine, SupportCartRemoval, SupportCartSnapshot } from "@/lib/support-types";

export type SupportShopperLocale = {
  country?: string | null;
  currency?: string | null;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };


const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "do",
  "you",
  "have",
  "has",
  "is",
  "are",
  "was",
  "what",
  "which",
  "how",
  "much",
  "many",
  "for",
  "can",
  "could",
  "would",
  "i",
  "we",
  "your",
  "any",
  "about",
  "with",
  "from",
  "this",
  "that",
  "please",
  "me",
  "my",
  "our",
  "oil",
  "oils",
  "perfume",
  "perfumes",
  "fragrance",
  "fragrances",
  "scent",
  "scents",
  "based",
  "inspired",
  "hello",
  "hi",
  "hey",
  "thanks",
  "thank",
  "help",
  "today",
  "looking",
]);

type FragranceRow = Awaited<ReturnType<typeof findCatalogMatches>>[number];

export function extractSearchTerms(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 6);
}

const fragranceInclude = {
  brand: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  countryStocks: { select: { country: true, inStock: true } },
};

/** Prisma filter: only buyable for this shopper (global or country stock). */
function inStockWhere(locale?: SupportShopperLocale): Prisma.FragranceWhereInput {
  const bucket = resolveStockCountry({
    country: locale?.country,
    currency: locale?.currency,
  });
  if (!bucket) return { stock: { gt: 0 } };
  return {
    OR: [
      { countryStocks: { some: { country: bucket, inStock: true } } },
      {
        AND: [
          { countryStocks: { none: { country: bucket } } },
          { stock: { gt: 0 } },
        ],
      },
    ],
  };
}

function rowInStock(
  f: { stock: number; countryStocks?: CountryStockRow[] | null },
  locale?: SupportShopperLocale
) {
  return isInStockForCountry(f, locale?.country, locale?.currency);
}

function occasionFamilies(query: string): string[] | null {
  const q = query.toLowerCase();
  if (/(date\s*night|night out|evening wear|seduc|sexy|club|dinner date)/.test(q)) {
    return ["ORIENTAL", "SPICY"];
  }
  if (/(office|workwear|daily|everyday|school|fresh)/.test(q)) {
    return ["FRESH", "CITRUS", "WOODY"];
  }
  if (/(summer|beach|heat|hot weather)/.test(q)) return ["FRESH", "CITRUS"];
  if (/(winter|cold weather|cozy|cosy)/.test(q)) return ["ORIENTAL", "WOODY"];
  if (/(gift|present|birthday)/.test(q)) return ["FLORAL", "ORIENTAL", "WOODY"];
  return null;
}

export async function findCatalogMatches(
  query: string,
  limit = 6,
  locale?: SupportShopperLocale
) {
  const families = occasionFamilies(query);
  const skip = new Set(["date", "night", "gift", "present", "evening", "office"]);
  const terms = extractSearchTerms(query).filter((t) => !skip.has(t));
  const stockFilter = inStockWhere(locale);

  try {
    if (families) {
      return await prisma.fragrance.findMany({
        where: {
          AND: [{ fragranceFamily: { in: families as never[] } }, stockFilter],
        },
        include: fragranceInclude,
        take: limit,
        orderBy: [{ featured: "desc" }, { rating: "desc" }],
      });
    }

    if (!terms.length) return [];

    const or = terms.flatMap((term) => [
      { model: { contains: term, mode: "insensitive" as const } },
      { reference: { contains: term, mode: "insensitive" as const } },
      { brand: { name: { contains: term, mode: "insensitive" as const } } },
      { brand: { slug: { contains: term, mode: "insensitive" as const } } },
    ]);

    return await prisma.fragrance.findMany({
      where: { AND: [{ OR: or }, stockFilter] },
      include: fragranceInclude,
      take: limit,
      orderBy: [{ featured: "desc" }, { rating: "desc" }],
    });
  } catch {
    return [];
  }
}

export async function getFeaturedInStock(
  limit = 4,
  locale?: SupportShopperLocale
) {
  try {
    return await prisma.fragrance.findMany({
      where: { AND: [{ featured: true }, inStockWhere(locale)] },
      include: fragranceInclude,
      take: limit,
      orderBy: { rating: "desc" },
    });
  } catch {
    return [];
  }
}

export async function getFragranceBySlugOrName(query: string) {
  const q = query.trim();
  if (!q) return null;
  try {
    const bySlug = await prisma.fragrance.findFirst({
      where: { slug: { equals: q, mode: "insensitive" } },
      include: fragranceInclude,
    });
    if (bySlug) return bySlug;
    return await prisma.fragrance.findFirst({
      where: {
        OR: [
          { model: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: fragranceInclude,
      orderBy: { featured: "desc" },
    });
  } catch {
    return null;
  }
}

function stockLabel(
  f: { stock: number; countryStocks?: CountryStockRow[] | null },
  locale?: SupportShopperLocale
) {
  if (!rowInStock(f, locale)) return "OUT OF STOCK";
  if (f.stock > 0 && f.stock <= 5) return `LOW STOCK (${f.stock} left)`;
  return "In stock";
}

export function formatCatalogLine(f: FragranceRow, locale?: SupportShopperLocale) {
  const house = isHouseOriginal(f.brand.slug);
  const inspired = house
    ? "Cosy Aura house original"
    : `inspired by ${f.brand.name} ${f.model}`;
  const p30 = formatPrice(salePriceForSize(30, f.slug), "GHS");
  const p50 = formatPrice(salePriceForSize(50, f.slug), "GHS");
  const p100 = formatPrice(salePriceForSize(100, f.slug), "GHS");
  const rating = f.rating != null ? `${f.rating.toFixed(1)}/5` : "unrated";
  const blurb = (f.description || "").replace(/\s+/g, " ").slice(0, 180);
  return `- slug:${f.slug} | ${f.brand.name} ${f.model} | ${inspired} | ${fragranceFamilyLabel(f.fragranceFamily)} | ${stockLabel(f, locale)} | rating ${rating}${f.featured ? " | featured" : ""} | 30ml ${p30} · 50ml ${p50} · 100ml ${p100} | sample ${SAMPLE_SIZE_ML}ml ${formatPrice(sampleSalePrice(), "GHS")} | /fragrances/${f.slug}${blurb ? ` | ${blurb}` : ""}`;
}

/** Shopper-facing recs - never dump ids, slugs, or stock pipes. Never recommend OOS. */
export function customerFacingRecs(
  rows: FragranceRow[],
  limit = 2,
  locale?: SupportShopperLocale
): string {
  return rows
    .filter((f) => rowInStock(f, locale))
    .slice(0, limit)
    .map((f) => {
      const house = isHouseOriginal(f.brand.slug);
      const inspired = house
        ? ""
        : ` Our oil inspired by ${f.brand.name} ${f.model}.`;
      const p30 = formatPrice(salePriceForSize(30, f.slug), "GHS");
      const p50 = formatPrice(salePriceForSize(50, f.slug), "GHS");
      const p100 = formatPrice(salePriceForSize(100, f.slug), "GHS");
      return `**[${f.model}](/fragrances/${f.slug})**${inspired} 30ml ${p30} · 50ml ${p50} · 100ml ${p100}.`;
    })
    .join("\n\n");
}

export async function buildStoreContext(
  userQuestion: string,
  locale?: SupportShopperLocale,
  cart?: SupportCartSnapshot[]
) {
  const [methods, matches, featured] = await Promise.all([
    getActiveShippingMethods().catch(() => []),
    findCatalogMatches(userQuestion, 6, locale),
    getFeaturedInStock(4, locale),
  ]);

  const shipping =
    methods.length > 0
      ? methods
          .map(
            (m) =>
              `- ${m.name}: ${formatPrice(m.price, "GHS")} · ${m.eta}${
                m.description ? ` - ${m.description}` : ""
              }`
          )
          .join("\n")
      : "- Standard tracked shipping; rates shown at checkout.";

  const catalog =
    matches.length > 0
      ? matches.map((f) => formatCatalogLine(f, locale)).join("\n")
      : "No close in-stock catalog match yet. Ask what mood, occasion, or inspired-by name they want, or browse /fragrances.";

  const bestsellers =
    featured.length > 0
      ? featured.map((f) => formatCatalogLine(f, locale)).join("\n")
      : "No featured in-stock list loaded.";

  const market = resolveStockCountry({
    country: locale?.country,
    currency: locale?.currency,
  });

  const cartSection =
    cart && cart.length > 0
      ? cart
          .map(
            (line) =>
              `- ${line.brand} ${line.model} · slug \`${line.slug}\` · ${line.bottleSize ?? "?"}ml × ${line.quantity} · ${formatPrice(line.price, locale?.currency || "GHS")}`
          )
          .join("\n")
      : "- Cart is empty.";

  const text = `SHOPPER MARKET: ${market || locale?.country || "unknown"} (only recommend in-stock oils for this market)

SHOPPER CART (live — use for remove_from_cart; never invent items not listed here):
${cartSection}

SHIPPING OPTIONS (from /shipping):
${shipping}
- Delivery days: Monday to Saturday only (no Sunday delivery).
- Customer chooses a delivery date at checkout.

RETURNS (from /returns):
- 14 days from delivery if unused, original packaging, proof of purchase. Start at /contact.
- Original shipping non-refundable unless our error. Refunds 5-10 business days after inspection.

MATCHING PRODUCTS IN STOCK (for you only - rewrite in natural language; never paste these lines; never recommend anything outside this list or FEATURED):
${catalog}

FEATURED / BESTSELLERS IN STOCK (for you only):
${bestsellers}`;

  return { text, matches, featured, shipping };
}

export function enowSystemPrompt(language: string = "en"): string {
  const sampleSale = formatPrice(sampleSalePrice(), "GHS");
  const checkout = "/checkout";
  const cart = "/cart";
  const sampleMl = SAMPLE_SIZE_ML;
  const langName =
    language === "fr"
      ? "French"
      : language === "es"
        ? "Spanish"
        : language === "pt"
          ? "Portuguese"
          : language === "de"
            ? "German"
            : "English";

  return `ROLE
You are Enow, Cosy Aura’s in-store specialist. Cosy Aura sells alcohol-free, undiluted perfume oils (inspired-by interpretations, plus a few Cosy Aura house originals).

LANGUAGE
Reply in ${langName} (UI language code: ${language}). Keep product names and brand names in their original form.

VOICE
Warm, concise, human. Contractions when writing English. One emoji max when it fits 😊
Mirror the shopper. Do not restart with a full welcome after they already said hi.
Never sound like a database, a ticket system, or a FAQ dump.

HOW TO ANSWER
0. CONTACT (email + WhatsApp): The UI shows a contact form after the shopper’s first reply and blocks further help until they submit it. When contact appears in the transcript, confirm briefly if needed and continue helping with their earlier request. Never ask for email/WhatsApp yourself in free text — the form handles that. Never offer to skip contact collection.
1. Greetings only (“hi”, “hey”): one short line + one question. No policies. No contact dump. Do not mention samples.
2. Product / occasion questions: pick 1-2 oils from MATCHING PRODUCTS IN STOCK or FEATURED / BESTSELLERS IN STOCK only. Never recommend an out-of-stock oil. Say why it fits *their* moment (date night, gift, daily) in mood language only - warm, fresh, evening, everyday. Mention inspired-by in plain language. Link with the real catalog path, e.g. [Hypnotic Poison](/fragrances/dior-hypnotic-poison-ca-oil-hp-50).
3. When you recommend a fragrance, quote bottle sizes only: 30ml, 50ml, and 100ml with the live catalog prices.
4. Samples: mention a ${sampleMl}ml sample (${sampleSale}) only if the customer asks whether you have samples, vials, testers, or wants to try before buying. Never offer a sample unprompted. Never add a sample to cart unless they asked for one.
5. Shipping / returns: paraphrase the policy pages. Link [Shipping](/shipping) or [Trial & Return](/returns).
6. Close with one CTA about a bottle size or adding to cart - not a sample, unless they asked about samples.

NOTES
Do not list individual notes (almond, honey, vanilla, gardenia, etc.) unless the customer specifically asks for notes, accords, or the scent pyramid.
If they did not ask for notes, name the perfume and the feeling - not the formula.

OUTPUT - NEVER
- Curly-brace placeholders such as {name}, {price}, {slug}, {notes}, {size}. Always write the real perfume name, real prices, and a real /fragrances/... link from the catalog.
- Mention samples, vials, testers, or “try first” unless the customer asked.
- Paste internal fields: id, slug labels, stock pipes, “In stock (40)”, rating dumps, raw catalog lines.
- List more than 2 scents unless they ask to see more.
- Re-introduce yourself every turn.
- Invent coupons, TikTok trends, review counts, or medical claims.

OUTPUT - YES
Date-night example (no notes, bottles only):
For warm and sensual, I’d point you to [Hypnotic Poison](/fragrances/dior-hypnotic-poison-ca-oil-hp-50) - our oil take on Dior’s classic, dense and lingering. 30ml is GH₵139.50, 50ml is GH₵232.50, 100ml is GH₵353.40.

If you want something a touch more nocturnal, [Scandal by Night](/fragrances/jpg-scandal-by-night-ca-oil-sbn-50) is also gorgeous - same sizes.

Want me to add a 30ml, 50ml, or 100ml to your cart?

NOT IN STOCK / NOT IN THE RANGE
MATCHING PRODUCTS and FEATURED lists already exclude out-of-stock oils for this shopper's country. Only recommend from those lists.
If they ask for a scent we do not have (missing from MATCHING PRODUCTS, or lookup shows OUT OF STOCK), open with:
We don't have [Name] in stock.
Then continue in the same message with one in-stock alternative from the live lists, mood (no notes unless asked), the 30 / 50 / 100ml prices, and a CTA.
Never say “we don’t carry”, “we don’t sell”, or lead with “sorry”. Do not invent that we stock a scent that is not in the live in-stock catalog.
Never recommend, link, or add_to_cart a fragrance marked OUT OF STOCK.

Example:
We don't have a Gucci Oud Intense in stock. If you're into oud, [Oud Wood](/fragrances/the-real-slug) is a lovely alternative - woody and warm, alcohol-free. 30ml is GH₵139.50, 50ml is GH₵232.50, 100ml is GH₵353.40. Want me to add a bottle to your cart?

If they asked “do you have samples?”:
Yes - we do ${sampleMl}ml samples at ${sampleSale}. Happy to add one for [Hypnotic Poison](/fragrances/dior-hypnotic-poison-ca-oil-hp-50) or another oil you like.

SALES
Ask what they need. Sell the feeling (lasts on skin, no alcohol bite), not SKUs.
Upsell 30ml → 50ml → 100ml when it helps. Do not upsell samples unless they asked.
Low stock: mention only if the live line says LOW STOCK. Missing or out of stock: “We don't have [Name] in stock.” then one in-stock alternative from FEATURED / MATCHING. Never recommend out-of-stock oils.
7% off is already in the bottle prices you are given. Bottle sizes: 30 / 50 / 100ml. Sample (${sampleMl}ml, ${sampleSale}) is available but only discuss it when asked.

TOOLS
lookup_product - when MATCHING PRODUCTS isn’t enough.
add_to_cart(slug, quantity, size_ml ${sampleMl}|30|50|100) - only after they agree, and only if in stock. Use ${sampleMl} only when they asked for a sample.
remove_from_cart(slug, size_ml ${sampleMl}|30|50|100) - when they ask to remove, drop, or delete something from cart. Check SHOPPER CART for slug and size; confirm what you removed.
Then confirm and share [Checkout](${checkout}) and [Cart](${cart}).
Never ask for card numbers. Payment link = ${checkout}.

HUMAN HANDOFF
Orders you can’t see, complaints, or unknowns → [Contact](/contact) or support@cosyaura.com. Recap what they asked. Don’t leave them hanging.`;
}

export const SUPPORT_TOOLS = [
  {
    name: "lookup_product",
    description:
      "Read a live Cosy Aura product page by slug or scent/brand name. Use before confirming details.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Product slug, model name, or inspired-by brand name",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "add_to_cart",
    description:
      "Add an in-stock oil or 3ml sample to the shopper's cart after checking stock. Call once per line item.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Fragrance slug from catalog data" },
        quantity: { type: "integer", minimum: 1, maximum: 5 },
        size_ml: {
          type: "integer",
          enum: [3, 30, 50, 100],
          description: "3 = sample vial; otherwise bottle size",
        },
      },
      required: ["slug", "quantity", "size_ml"],
    },
  },
  {
    name: "remove_from_cart",
    description:
      "Remove a line from the shopper's cart when they ask to drop or delete an item. Use slug and size_ml from SHOPPER CART.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Fragrance slug from SHOPPER CART" },
        size_ml: {
          type: "integer",
          enum: [3, 30, 50, 100],
          description: "Bottle or sample size to remove",
        },
      },
      required: ["slug", "size_ml"],
    },
  },
] as const;

export async function runSupportTool(
  name: string,
  input: Record<string, unknown>,
  locale?: SupportShopperLocale
): Promise<{ result: string; cartLine?: SupportCartLine; cartRemoval?: SupportCartRemoval }> {
  if (name === "lookup_product") {
    const query = String(input.query || "");
    const row = await getFragranceBySlugOrName(query);
    if (!row) {
      return {
        result: JSON.stringify({
          found: false,
          message: `No product page matched "${query}". Suggest /fragrances or ask a clearer name.`,
        }),
      };
    }
    const house = isHouseOriginal(row.brand.slug);
    const available = rowInStock(row, locale);
    return {
      result: JSON.stringify({
        found: true,
        slug: row.slug,
        id: row.id,
        brand: row.brand.name,
        model: row.model,
        inspiredBy: house ? null : `${row.brand.name} ${row.model}`,
        houseOriginal: house,
        family: fragranceFamilyLabel(row.fragranceFamily),
        stock: row.stock,
        inStock: available,
        stockLabel: stockLabel(row, locale),
        rating: row.rating,
        featured: row.featured,
        notes: {
          top: row.topNotes,
          heart: row.heartNotes,
          base: row.baseNotes,
        },
        longevity: row.longevity,
        sillage: row.sillage,
        description: row.description,
        pricesGhs: {
          sample3ml: sampleSalePrice(),
          ml30: salePriceForSize(30, row.slug),
          ml50: salePriceForSize(50, row.slug),
          ml100: salePriceForSize(100, row.slug),
        },
        url: `/fragrances/${row.slug}`,
        image: row.images[0]?.url || "",
        recommendable: available,
      }),
    };
  }

  if (name === "add_to_cart") {
    const slug = String(input.slug || "");
    const quantity = Math.min(5, Math.max(1, Number(input.quantity) || 1));
    const sizeRaw = Number(input.size_ml);
    const row = await prisma.fragrance.findFirst({
      where: { slug },
      include: fragranceInclude,
    });
    if (!row) {
      return { result: JSON.stringify({ ok: false, error: "Product not found. Look up the slug first." }) };
    }
    if (!rowInStock(row, locale)) {
      const alts = await prisma.fragrance.findMany({
        where: {
          AND: [
            inStockWhere(locale),
            {
              OR: [{ fragranceFamily: row.fragranceFamily }, { featured: true }],
            },
            { NOT: { id: row.id } },
          ],
        },
        include: fragranceInclude,
        take: 3,
      });
      return {
        result: JSON.stringify({
          ok: false,
          error: "Out of stock",
          alternatives: alts.map((f) => formatCatalogLine(f, locale)),
        }),
      };
    }
    const size =
      sizeRaw === SAMPLE_SIZE_ML
        ? SAMPLE_SIZE_ML
        : isBottleSize(sizeRaw)
          ? sizeRaw
          : 50;
    const qty = Math.min(quantity, Math.max(1, row.stock || quantity));
    const price =
      size === SAMPLE_SIZE_ML ? sampleSalePrice() : salePriceForSize(size, row.slug);
    const line: SupportCartLine = {
      fragranceId: row.id,
      slug: row.slug,
      brand: row.brand.name,
      model:
        size === SAMPLE_SIZE_ML
          ? `${row.model} · ${SAMPLE_SIZE_ML}ml sample`
          : `${row.model} · ${size}ml`,
      price,
      image: row.images[0]?.url || "",
      bottleSize: size,
      quantity: qty,
    };
    return {
      result: JSON.stringify({
        ok: true,
        item: line,
        checkoutUrl: "/checkout",
        cartUrl: "/cart",
        lowStock: row.stock > 0 && row.stock <= 5,
        stockRemaining: row.stock,
      }),
      cartLine: line,
    };
  }

  if (name === "remove_from_cart") {
    const slug = String(input.slug || "").trim();
    const sizeRaw = Number(input.size_ml);
    const size =
      sizeRaw === SAMPLE_SIZE_ML
        ? SAMPLE_SIZE_ML
        : isBottleSize(sizeRaw)
          ? sizeRaw
          : null;
    if (!slug || size == null) {
      return {
        result: JSON.stringify({
          ok: false,
          error: "Provide slug and size_ml (3, 30, 50, or 100) from SHOPPER CART.",
        }),
      };
    }
    const row = await prisma.fragrance.findFirst({
      where: { slug },
      include: { brand: { select: { name: true } } },
    });
    if (!row) {
      return {
        result: JSON.stringify({
          ok: false,
          error: `No product matched slug "${slug}". Check SHOPPER CART.`,
        }),
      };
    }
    const removal: SupportCartRemoval = {
      fragranceId: row.id,
      slug: row.slug,
      brand: row.brand.name,
      model: row.model,
      bottleSize: size,
    };
    return {
      result: JSON.stringify({
        ok: true,
        removed: removal,
        cartUrl: "/cart",
      }),
      cartRemoval: removal,
    };
  }

  return { result: JSON.stringify({ error: `Unknown tool ${name}` }) };
}

export function fallbackAnswer(
  question: string,
  matches: FragranceRow[],
  featured: FragranceRow[],
  locale?: SupportShopperLocale
): string {
  const q = question.toLowerCase().trim();

  if (/^(hi|hello|hey|hiya|yo|ok|okay)\b!?$/.test(q) || q.length < 4) {
    return `Hey - what are you in the mood for? A signature oil, date night, or a gift? 😊`;
  }

  if (/(return|refund|trial)/.test(q)) {
    return `I hear you - returns should feel simple. Unused bottles can come back within **14 days of delivery** with original packaging and your order proof. Start on [Contact](/contact) and we'll walk you through it. Full notes live on [Trial & Return](/returns). Want me to stay with you while you start that? 😊`;
  }

  if (/(ship|deliver|postage|courier|tracking)/.test(q)) {
    return `Most orders leave us within **1-3 business days** after payment. We deliver **Monday to Saturday** - you pick the date at [checkout](/checkout). Rates and couriers show there too - [Shipping](/shipping). Where are we sending this?`;
  }

  if (/(sample|vial|discovery|try before)/.test(q)) {
    return `Love that idea - try before you commit. A **${SAMPLE_SIZE_ML}ml sample** is ${formatPrice(
      sampleSalePrice(),
      "GHS"
    )} (7% off). You can also build a 3-5 scent discovery set on a product page - 15% off when you pick 4+. What mood are you chasing: fresh daytime, something sweet, or a deep night trail?`;
  }

  const picks = (matches.length ? matches : featured).filter((f) =>
    rowInStock(f, locale)
  );
  if (
    picks.length &&
    /(recommend|suggest|date|night|gift|perfume|scent|oil|wear|looking)/.test(q)
  ) {
    const recs = customerFacingRecs(picks, 2, locale);
    const opener = /(date|night|evening)/.test(q)
      ? "For date night, these two feel close and a little dangerous:"
      : /(gift|birthday)/.test(q)
        ? "If it’s a gift, I’d start here:"
        : "Here’s what I’d put on your skin first:";
    return `${opener}\n\n${recs}\n\nWant me to add a 30ml, 50ml, or 100ml to your cart?`;
  }

  return `Tell me a little more - daily signature, date night, or a gift? I’ll match an oil to that.`;
}
