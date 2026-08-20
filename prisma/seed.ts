import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDefaultShippingMethods } from "../src/lib/shipping-methods";
import { slugify } from "../src/lib/utils";
import { catalog } from "./oil-catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Cosy Aura oil-based fragrance catalog...");

  const slugs = catalog.map((c) => slugify(`${c.brandSlug}-${c.model}-${c.reference}`));
  const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupSlugs.length) {
    throw new Error(`Duplicate catalog slugs: ${Array.from(new Set(dupSlugs)).join(", ")}`);
  }

  const identityKeys = catalog.map((c) => `${c.brandSlug}::${c.model.toLowerCase()}`);
  const dupNames = identityKeys.filter((k, i) => identityKeys.indexOf(k) !== i);
  if (dupNames.length) {
    throw new Error(`Duplicate brand+model entries: ${Array.from(new Set(dupNames)).join(", ")}`);
  }

  await seedDefaultShippingMethods();

  await prisma.storeConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      nonAfricaMarkupEnabled: false,
      nonAfricaMarkupUsd: 10,
    },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@cosyaura.com" },
    update: {},
    create: {
      email: "admin@cosyaura.com",
      name: "Admin",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const uniqueBrands = Array.from(
    new Map(catalog.map((c) => [c.brandSlug, { name: c.brand, slug: c.brandSlug }])).values()
  );

  const brandIds: Record<string, string> = {};
  for (const brand of uniqueBrands) {
    const row = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name },
      create: brand,
    });
    brandIds[brand.slug] = row.id;
  }

  const keepSlugs: string[] = [];

  for (const item of catalog) {
    const brandId = brandIds[item.brandSlug];
    const slug = slugify(`${item.brandSlug}-${item.model}-${item.reference}`);
    keepSlugs.push(slug);

    let seriesId: string | null = null;
    if (item.series) {
      const seriesSlug = slugify(item.series);
      const series = await prisma.series.upsert({
        where: { brandId_slug: { brandId, slug: seriesSlug } },
        update: { name: item.series },
        create: { brandId, name: item.series, slug: seriesSlug },
      });
      seriesId = series.id;
    }

    const concentration = item.concentration ?? "PARFUM";
    const collection = item.collection ?? "Oil Atelier";
    const year = item.year ?? 2025;
    const isEdp = concentration === "EDP";
    const conditionReport = isEdp
      ? "Brand new sealed EDP-strength perfume oil. Alcohol-free formula in frosted glass with wooden sphere cap. Available in 30ml, 50ml, and 100ml."
      : "Brand new sealed oil perfume. Alcohol-free formula in frosted glass with wooden sphere cap. Available in 30ml, 50ml, and 100ml.";

    const fragrance = await prisma.fragrance.upsert({
      where: { slug },
      update: {
        brandId,
        seriesId,
        model: item.model,
        reference: item.reference,
        description: item.description,
        conditionReport,
        price: item.price,
        condition: "UNWORN",
        year,
        fragranceFamily: item.family,
        bottleMaterial: "GLASS",
        bottleDetail: "Frosted glass with spherical wooden cap",
        bottleSize: 50,
        capType: "DAB_ON",
        liquidColor: "Golden amber perfume oil",
        longevity: item.longevity,
        bottleShape: "Round",
        concentration,
        topNotes: item.topNotes,
        heartNotes: item.heartNotes,
        baseNotes: item.baseNotes,
        sillage: item.sillage,
        sustainabilityScore: 5,
        isVegan: true,
        isCrueltyFree: true,
        sampleAvailable: true,
        gender: item.gender,
        collection,
        stock: 40,
        rating: 4.7,
        featured: item.featured ?? false,
        category: item.category,
      },
      create: {
        brandId,
        seriesId,
        slug,
        model: item.model,
        reference: item.reference,
        description: item.description,
        conditionReport,
        price: item.price,
        condition: "UNWORN",
        year,
        fragranceFamily: item.family,
        bottleMaterial: "GLASS",
        bottleDetail: "Frosted glass with spherical wooden cap",
        bottleSize: 50,
        capType: "DAB_ON",
        liquidColor: "Golden amber perfume oil",
        longevity: item.longevity,
        bottleShape: "Round",
        concentration,
        topNotes: item.topNotes,
        heartNotes: item.heartNotes,
        baseNotes: item.baseNotes,
        sillage: item.sillage,
        sustainabilityScore: 5,
        isVegan: true,
        isCrueltyFree: true,
        sampleAvailable: true,
        gender: item.gender,
        collection,
        stock: 40,
        rating: 4.7,
        featured: item.featured ?? false,
        category: item.category,
      },
    });

    await prisma.fragranceImage.deleteMany({ where: { fragranceId: fragrance.id } });
    await prisma.fragranceImage.createMany({
      data: item.images.map((url, i) => ({
        fragranceId: fragrance.id,
        url,
        alt: `${item.brand} ${item.model} oil perfume`,
        isPrimary: i === 0,
        sortOrder: i,
      })),
    });
  }

  const ordered = await prisma.orderItem.findMany({
    select: { fragranceId: true },
    distinct: ["fragranceId"],
  });
  const orderedIds = new Set(ordered.map((o) => o.fragranceId));
  const stale = await prisma.fragrance.findMany({
    where: { slug: { notIn: keepSlugs } },
    select: { id: true, slug: true, model: true },
  });
  const deletable = stale.filter((f) => !orderedIds.has(f.id));
  if (deletable.length) {
    const ids = deletable.map((f) => f.id);
    await prisma.wishlistItem.deleteMany({ where: { fragranceId: { in: ids } } });
    await prisma.fragranceImage.deleteMany({ where: { fragranceId: { in: ids } } });
    await prisma.fragrance.deleteMany({ where: { id: { in: ids } } });
    console.log(`Removed ${deletable.length} stale/duplicate products: ${deletable.map((f) => f.slug).join(", ")}`);
  }

  await prisma.brand.deleteMany({
    where: {
      fragrances: { none: {} },
      slug: { notIn: uniqueBrands.map((b) => b.slug) },
    },
  });

  const remaining = await prisma.fragrance.findMany({
    select: { brandId: true, model: true, slug: true },
    orderBy: { model: "asc" },
  });
  const seen = new Map<string, string>();
  const leftoverDupes: string[] = [];
  for (const row of remaining) {
    const key = `${row.brandId}::${row.model.toLowerCase()}`;
    if (seen.has(key)) leftoverDupes.push(`${seen.get(key)} + ${row.slug}`);
    else seen.set(key, row.slug);
  }
  if (leftoverDupes.length) {
    throw new Error(`Database still has duplicate products: ${leftoverDupes.join("; ")}`);
  }

  console.log(
    `Seeded ${uniqueBrands.length} brands and ${catalog.length} oil-based perfumes (${catalog.reduce((n, c) => n + c.images.length, 0)} images).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
