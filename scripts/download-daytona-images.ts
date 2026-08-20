import {
  downloadWristAficionadoImage,
  fetchWristAficionadoDaytonas,
} from "../src/lib/wristaficionado";

async function main() {
  console.log("Fetching Rolex Daytona products from Wrist Aficionado...");
  const products = await fetchWristAficionadoDaytonas();

  if (products.length === 0) {
    throw new Error("No Daytona products found.");
  }

  console.log(`Found ${products.length} products. Downloading images...`);

  let done = 0;
  for (const product of products) {
    const localPath = await downloadWristAficionadoImage(product);
    done += 1;
    console.log(`[${done}/${products.length}] ${product.reference} (${product.sku}) -> ${localPath}`);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
