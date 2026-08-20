#!/usr/bin/env npx tsx
/**
 * Step 8 validation — perfume migration smoke checks.
 * Usage: npx tsx scripts/validate-perfume-migration.ts
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const root = process.cwd();
const prisma = new PrismaClient();
const results: { check: string; ok: boolean; detail?: string }[] = [];

function pass(check: string, detail?: string) {
  results.push({ check, ok: true, detail });
  console.log(`✓ ${check}${detail ? ` — ${detail}` : ""}`);
}
function fail(check: string, detail?: string) {
  results.push({ check, ok: false, detail });
  console.error(`✗ ${check}${detail ? ` — ${detail}` : ""}`);
}
function exists(rel: string) {
  return fs.existsSync(path.join(root, rel));
}

async function main() {
  console.log("\n=== STEP 8: Perfume Migration Validation ===\n");

  // Pre-migration / tooling
  if (exists("scripts/backup-db.sh")) pass("Backup script present");
  else fail("Backup script present");

  if (exists("prisma/migrations/ROLLBACK_migrate_to_perfume.sql"))
    pass("Rollback SQL present");
  else fail("Rollback SQL present");

  if (exists("prisma/migrations/20260807_migrate_to_perfume/migration.sql"))
    pass("Forward migration SQL present");
  else fail("Forward migration SQL present");

  if (exists("public/images/og-perfume.png")) pass("OG perfume image present");
  else fail("OG perfume image present");

  // Routes / components
  const requiredPaths = [
    "src/app/fragrances/page.tsx",
    "src/app/fragrances/[slug]/page.tsx",
    "src/app/fragrance-finder/page.tsx",
    "src/app/sitemap.ts",
    "src/lib/seo.ts",
    "src/lib/filter-options.ts",
    "src/lib/fragrances.ts",
    "src/components/perfume/ScentPyramid.tsx",
    "src/components/perfume/FragranceQuiz.tsx",
    "src/components/perfume/SustainabilityBadge.tsx",
    "src/components/perfume/DiscoverySetBuilder.tsx",
    "src/components/perfume/ScentLayeringGuide.tsx",
    "src/components/products/FilterSidebar.tsx",
    "src/components/products/ProductToolbar.tsx",
    "src/components/products/ProductDetail.tsx",
    "src/components/products/ProductCard.tsx",
  ];
  for (const p of requiredPaths) {
    if (exists(p)) pass(`File: ${p}`);
    else fail(`File: ${p}`);
  }

  const gone = [
    "src/app/watches/page.tsx",
    "src/app/admin/watches/page.tsx",
  ];
  for (const p of gone) {
    if (!exists(p)) pass(`Removed watch route: ${p}`);
    else fail(`Removed watch route: ${p}`, "still exists");
  }

  // SEO constants
  try {
    const seoSrc = fs.readFileSync(path.join(root, "src/lib/seo.ts"), "utf8");
    if (seoSrc.includes("Artisan Fragrances from Grasse"))
      pass("SEO title/description perfume copy");
    else fail("SEO title/description perfume copy");
    if (seoSrc.includes("luxury perfume") && seoSrc.includes("Grasse"))
      pass("SEO keywords perfume-focused");
    else fail("SEO keywords perfume-focused");
  } catch (e: any) {
    fail("Read seo.ts", e.message);
  }

  // Filter options
  try {
    const fo = fs.readFileSync(path.join(root, "src/lib/filter-options.ts"), "utf8");
    for (const token of [
      "FRAGRANCE_FAMILY_OPTIONS",
      "CONCENTRATION_OPTIONS",
      "LONGEVITY_OPTIONS",
      "BOTTLE_SIZE_OPTIONS",
      "SILLAGE_OPTIONS",
      "COLLECTION_OPTIONS",
      "SUSTAINABILITY_OPTIONS",
      "PRICE_RANGE_OPTIONS",
    ]) {
      if (fo.includes(token)) pass(`Filter option: ${token}`);
      else fail(`Filter option: ${token}`);
    }
  } catch (e: any) {
    fail("Read filter-options.ts", e.message);
  }

  // Database
  console.log("\n--- Database ---\n");
  try {
    await prisma.$queryRaw`SELECT 1`;
    pass("Neon/Postgres connection");
  } catch (e: any) {
    fail("Neon/Postgres connection", e.message?.slice(0, 200));
    printSummary();
    process.exit(1);
  }

  try {
    const tables = await prisma.$queryRawUnsafe<
      { table_name: string }[]
    >(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Fragrance','FragranceImage','Watch','WatchImage') ORDER BY 1`
    );
    const names = tables.map((t) => t.table_name);
    if (names.includes("Fragrance") && names.includes("FragranceImage"))
      pass("Fragrance tables exist", names.join(", "));
    else fail("Fragrance tables exist", names.join(", ") || "none");
    if (!names.includes("Watch")) pass("Watch table removed/renamed");
    else fail("Watch table removed/renamed", "Watch still present");
  } catch (e: any) {
    fail("Table rename check", e.message?.slice(0, 200));
  }

  try {
    const count = await prisma.fragrance.count();
    if (count > 0) pass("Fragrance catalog seeded", `${count} products`);
    else fail("Fragrance catalog seeded", "0 products");

    const sample = await prisma.fragrance.findFirst({
      where: { model: "Midnight Orchid" },
      include: { brand: true, images: true },
    });
    if (sample) {
      pass(
        "Midnight Orchid product",
        `${sample.brand.name} · ${sample.concentration} · ${sample.bottleSize}ml · notes:${sample.topNotes.length}/${sample.heartNotes.length}/${sample.baseNotes.length}`
      );
      if (sample.images.length) pass("Product has images", String(sample.images.length));
      else fail("Product has images");
    } else fail("Midnight Orchid product", "not found");

    const brands = await prisma.brand.count();
    pass("Brands present", String(brands));

    const withFamily = await prisma.fragrance.count({
      where: { fragranceFamily: { not: undefined as never } },
    });
    pass("fragranceFamily populated", String(withFamily));

    const orphans = await prisma.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(*)::int AS c FROM "OrderItem" oi LEFT JOIN "Fragrance" f ON f.id = oi."fragranceId" WHERE f.id IS NULL`
    );
    if ((orphans[0]?.c ?? 0) === 0) pass("OrderItem FKs intact");
    else fail("OrderItem FKs intact", `${orphans[0].c} orphans`);
  } catch (e: any) {
    fail("Catalog / FK checks", e.message?.slice(0, 300));
  }

  printSummary();
}

function printSummary() {
  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n=== Summary: ${ok} passed, ${bad} failed ===\n`);
  if (bad > 0) {
    console.log("Failed checks:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.check}: ${r.detail || ""}`));
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
