/**
 * Apply standard catalog unit costs across all products.
 *
 * Perfumes: 30ml = 45 · 50ml = 70 · 100ml = 150 GHS
 * Sunglasses & sneakers: 80 GHS · Watches: 150 GHS
 *
 *   npx tsx scripts/backfill-catalog-cost-prices.ts
 *   npx tsx scripts/backfill-catalog-cost-prices.ts --apply
 */
import { defaultCatalogCostPriceGhs } from "./lib/catalog-cost";
import { createScriptPrisma } from "./lib/script-prisma";

const apply = process.argv.includes("--apply");

async function main() {
  const { prisma, disconnect } = createScriptPrisma();

  try {
    const rows = await prisma.fragrance.findMany({
      select: {
        id: true,
        model: true,
        reference: true,
        productType: true,
        bottleSize: true,
        costPriceGhs: true,
      },
      orderBy: [{ productType: "asc" }, { model: "asc" }],
    });

    let changes = 0;

    for (const row of rows) {
      const next = defaultCatalogCostPriceGhs(row.productType, row.bottleSize);
      if (next <= 0) continue;
      if (Math.abs(next - row.costPriceGhs) < 0.001) continue;

      changes += 1;
      console.log(
        `  [${row.productType}] ${row.model} (${row.reference}): GHS ${row.costPriceGhs} → GHS ${next}${apply ? "" : " (dry run)"}`
      );

      if (apply) {
        await prisma.fragrance.update({
          where: { id: row.id },
          data: { costPriceGhs: next },
        });
      }
    }

    console.log(`\n${changes} product(s) need cost updates.`);

    if (!apply && changes) {
      console.log("Re-run with --apply to update the database.");
    }
  } finally {
    await disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
