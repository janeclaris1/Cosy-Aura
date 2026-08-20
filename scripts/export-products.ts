#!/usr/bin/env npx tsx
/** Export fragrance catalog JSON (Step 8 backup helper). */
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.fragrance.findMany({
    include: { brand: true, series: true, images: true },
    orderBy: { createdAt: "desc" },
  });
  const out = process.argv[2] || `backups/fragrances-export-${Date.now()}.json`;
  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(out, JSON.stringify(products, null, 2));
  console.log(`Exported ${products.length} fragrances → ${out}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
