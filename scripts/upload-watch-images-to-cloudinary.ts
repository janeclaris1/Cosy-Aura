/**
 * Upload local watch images to Cloudinary and update FragranceImage URLs.
 * Run once so deployed Hostinger builds serve images from Cloudinary, not /public.
 *
 * Usage:
 *   npx tsx scripts/upload-watch-images-to-cloudinary.ts
 *   npx tsx scripts/upload-watch-images-to-cloudinary.ts --apply
 */
import { createHash } from "crypto";
import { createScriptPrisma } from "./lib/script-prisma";
import {
  cloudinaryReady,
  migratePublicUrlToCloudinary,
  optimizeProductImageUrl,
} from "./lib/product-image-storage";

const apply = process.argv.includes("--apply");

function cloudPublicId(imageId: string, publicUrl: string): string {
  const hash = createHash("sha256").update(publicUrl).digest("hex").slice(0, 12);
  return `watch-${imageId}-${hash}`;
}

async function updateImageUrl(imageId: string, url: string): Promise<void> {
  const { prisma, disconnect } = createScriptPrisma();
  try {
    await prisma.fragranceImage.update({
      where: { id: imageId },
      data: { url },
    });
  } finally {
    await disconnect();
  }
}

async function main() {
  if (!cloudinaryReady()) {
    console.error(
      "Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET in .env"
    );
    process.exit(1);
  }

  const { prisma, disconnect } = createScriptPrisma();

  let images: Awaited<ReturnType<typeof prisma.fragranceImage.findMany>>;
  try {
    images = await prisma.fragranceImage.findMany({
      where: {
        OR: [
          { url: { startsWith: "/images/watches/" } },
          {
            fragrance: { productType: "WATCH" },
            url: { not: { startsWith: "https://" } },
          },
        ],
      },
      include: {
        fragrance: {
          select: { slug: true, productType: true, brand: { select: { slug: true } } },
        },
      },
      orderBy: { id: "asc" },
    });
  } finally {
    await disconnect();
  }

  const toMigrate = images.filter(
      (img) =>
        img.url.startsWith("/images/watches/") ||
        (img.fragrance.productType === "WATCH" && !img.url.startsWith("http"))
  );

  console.log(
    apply ? "Uploading watch images to Cloudinary…" : "Dry run — pass --apply to upload"
  );
  console.log(`Found ${toMigrate.length} local watch image record(s)\n`);

  let uploaded = 0;
  let skipped = 0;
  let alreadyRemote = 0;

  for (const image of toMigrate) {
    if (image.url.startsWith("https://")) {
      alreadyRemote++;
      continue;
    }

    const folder = `cosyaura/catalog/watches/${image.fragrance.slug}`;
    const publicId = cloudPublicId(image.id, image.url);

    if (!apply) {
      console.log(`  would upload ${image.url} → cloudinary:${folder}/${publicId}`);
      continue;
    }

    const remoteUrl = await migratePublicUrlToCloudinary(
      image.url,
      folder,
      publicId
    );

    if (!remoteUrl) {
      console.warn(`  ⚠ skipped (file missing): ${image.url}`);
      skipped++;
      continue;
    }

    const finalUrl = optimizeProductImageUrl(remoteUrl);
    await updateImageUrl(image.id, finalUrl);

    console.log(`  ✓ ${image.fragrance.slug}: ${finalUrl}`);
    uploaded++;
  }

  console.log(
    `\nDone. uploaded=${uploaded} skipped=${skipped} alreadyRemote=${alreadyRemote}`
  );
  if (!apply) {
    console.log("\nRe-run with --apply to persist Cloudinary URLs to the database.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
