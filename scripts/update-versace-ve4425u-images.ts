/**
 * Refresh VE4425U Blue/Dark Grey images from Sunglass Hut (VE4430U UPC assets).
 *
 * Usage: npx tsx scripts/update-versace-ve4425u-images.ts
 */
import { createScriptPrisma } from "./lib/script-prisma";
import { downloadSunglassesImagesFromUrls } from "./lib/catalog-image-import";

const SLUG = "versace-ve4425u-blue-dark-grey-ve4425u-5368-87";
const UPC = "8056597724388";
const IMAGE_SUFFIXES = ["000A", "030A", "060A", "090A"];

async function main() {
  const sourceUrls = IMAGE_SUFFIXES.map(
    (suffix) =>
      `https://za.sunglasshut.com/wordpress/wp-content/themes/sunglasshut/assets/product_images/${UPC}_${suffix}.jpg`
  );

  const { prisma, disconnect } = createScriptPrisma();
  try {
    const product = await prisma.fragrance.findUnique({
      where: { slug: SLUG },
      select: { id: true, model: true, brand: { select: { name: true } } },
    });
    if (!product) {
      throw new Error(`Product not found: ${SLUG}`);
    }

    console.log(`Updating images for ${product.brand.name} ${product.model}…`);
    const cloudUrls = await downloadSunglassesImagesFromUrls(sourceUrls, SLUG, true);

    await prisma.fragranceImage.deleteMany({ where: { fragranceId: product.id } });
    await prisma.fragranceImage.createMany({
      data: cloudUrls.map((url, index) => ({
        fragranceId: product.id,
        url,
        alt: "Versace VE4425U Blue/Dark Grey sunglasses",
        isPrimary: index === 0,
        sortOrder: index,
      })),
    });

    console.log(`Done — ${cloudUrls.length} image(s) saved.`);
    for (const url of cloudUrls) console.log(`  · ${url}`);
  } finally {
    await disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
