import {
  downloadLuxurytimeImages,
  fetchLuxurytimeCollection,
} from "../src/lib/luxurytime";

async function main() {
  console.log("Fetching Hublot products from Luxurytime...");
  const products = await fetchLuxurytimeCollection("hublot");

  if (products.length === 0) {
    throw new Error("No Hublot products found.");
  }

  console.log(`Found ${products.length} products. Downloading all images...`);

  for (const product of products) {
    const paths = await downloadLuxurytimeImages(product);
    console.log(
      `${product.reference} (${product.sku}) -> ${paths.length} images in ${product.imageDir}/${product.sku}`
    );
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
