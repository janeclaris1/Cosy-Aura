import { prisma } from "./prisma";

export async function syncFragrancesToAlgolia() {
  const adminKey = process.env.ALGOLIA_ADMIN_KEY;
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;

  if (!adminKey || !appId) {
    console.log("Algolia credentials not configured, skipping sync");
    return;
  }

  const { algoliasearch } = await import("algoliasearch");
  const client = algoliasearch(appId, adminKey);

  const fragrances = await prisma.fragrance.findMany({
    include: { brand: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  const records = fragrances.map((f) => ({
    objectID: f.id,
    slug: f.slug,
    brand: f.brand.name,
    brandSlug: f.brand.slug,
    model: f.model,
    reference: f.reference,
    description: f.description,
    price: f.price,
    condition: f.condition,
    fragranceFamily: f.fragranceFamily,
    bottleMaterial: f.bottleMaterial,
    capType: f.capType,
    concentration: f.concentration,
    bottleSize: f.bottleSize,
    year: f.year,
    gender: f.gender,
    image: f.images[0]?.url || "",
    featured: f.featured,
    category: f.category,
    createdAt: f.createdAt.getTime(),
  }));

  await client.setSettings({
    indexName: "fragrances",
    indexSettings: {
      searchableAttributes: ["brand", "model", "reference", "description"],
      attributesForFaceting: [
        "filterOnly(brand)",
        "filterOnly(condition)",
        "filterOnly(fragranceFamily)",
        "filterOnly(bottleMaterial)",
        "filterOnly(capType)",
        "filterOnly(concentration)",
        "filterOnly(price)",
      ],
      customRanking: ["asc(price)", "desc(createdAt)"],
    },
  });

  await client.saveObjects({ indexName: "fragrances", objects: records });
  console.log(`Synced ${records.length} fragrances to Algolia`);
}

/** @deprecated Use syncFragrancesToAlgolia */
export const syncWatchesToAlgolia = syncFragrancesToAlgolia;
