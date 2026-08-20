import {
  downloadWristAficionadoImage,
  fetchWristAficionadoCollection,
  type WristCollectionKey,
} from "../src/lib/wristaficionado";

const collectionKey = (process.argv[2] ?? "nautilus") as WristCollectionKey;

async function main() {
  console.log(`Fetching ${collectionKey} products from Wrist Aficionado...`);
  const products = await fetchWristAficionadoCollection(collectionKey);

  if (products.length === 0) {
    throw new Error(`No products found for ${collectionKey}.`);
  }

  console.log(`Found ${products.length} products. Downloading images...`);

  let done = 0;
  for (const product of products) {
    const localPath = await downloadWristAficionadoImage(product);
    done += 1;
    console.log(
      `[${done}/${products.length}] ${product.reference} (${product.sku}) -> ${localPath}`
    );
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
