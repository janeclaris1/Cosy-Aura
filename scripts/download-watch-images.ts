import {
  downloadWatchfinderImage,
  fetchWatchfinderOffers,
  type WatchfinderLocale,
} from "../src/lib/watchfinder";

const UK_BRANDS = new Set([
  "breitling",
  "hublot",
  "tudor",
  "iwc",
  "panerai",
  "bremont",
  "grand-seiko",
  "tag-heuer",
]);

const brandSlug = process.argv[2] ?? "rolex";
const locale: WatchfinderLocale = UK_BRANDS.has(brandSlug) ? "uk" : "com";

async function main() {
  console.log(`Fetching ${brandSlug} offers from Watchfinder (${locale})...`);
  const offers = await fetchWatchfinderOffers(brandSlug, { locale });

  if (offers.length === 0) {
    throw new Error(`No offers found on Watchfinder for ${brandSlug}.`);
  }

  console.log(`Found ${offers.length} offers. Downloading images...`);

  for (const offer of offers) {
    const localPath = await downloadWatchfinderImage(brandSlug, offer.sku, offer.imageUrl);
    console.log(`${offer.reference} (${offer.year}) [${offer.sku}] -> ${localPath}`);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
