/**
 * Rewrite all watch descriptions to plain-text Cosy Aura format.
 *
 * Usage:
 *   npx tsx scripts/rewrite-watch-descriptions.ts
 *   npx tsx scripts/rewrite-watch-descriptions.ts --apply
 */
import { rebuildWatchDescriptionFromRecord } from "./lib/catalog-product-description";
import { createScriptPrisma } from "./lib/script-prisma";

const apply = process.argv.includes("--apply");

async function main() {
  const { prisma, disconnect } = createScriptPrisma();

  try {
    const watches = await prisma.fragrance.findMany({
      where: { productType: "WATCH" },
      select: {
        id: true,
        slug: true,
        model: true,
        reference: true,
        category: true,
        collection: true,
        bottleDetail: true,
        liquidColor: true,
        longevity: true,
        bottleSize: true,
        condition: true,
        description: true,
        brand: { select: { name: true } },
      },
      orderBy: { model: "asc" },
    });

    console.log(
      apply
        ? `Rewriting ${watches.length} watch description(s)…`
        : `Dry run — ${watches.length} watch description(s). Pass --apply to write.\n`
    );

    for (const watch of watches) {
      const next = rebuildWatchDescriptionFromRecord({
        model: watch.model,
        reference: watch.reference,
        category: watch.category,
        collection: watch.collection,
        bottleDetail: watch.bottleDetail,
        liquidColor: watch.liquidColor,
        longevity: watch.longevity,
        bottleSize: watch.bottleSize,
        condition: watch.condition,
        brandName: watch.brand.name,
        legacyDescription: watch.description,
      });

      console.log(`\n── ${watch.slug}`);
      console.log(next.split("\n").slice(0, 6).join("\n"));
      if (next.split("\n").length > 6) console.log("…");

      if (apply) {
        await prisma.fragrance.update({
          where: { id: watch.id },
          data: { description: next },
        });
      }
    }

    console.log(
      apply
        ? `\nDone — ${watches.length} watch description(s) updated.`
        : "\nDry run complete. Re-run with --apply to persist."
    );
  } finally {
    await disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
