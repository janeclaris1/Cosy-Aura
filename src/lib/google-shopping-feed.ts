import { absoluteUrl } from "@/lib/seo";
import {
  GOOGLE_PRODUCT_CATEGORY,
  SELLER_BRAND,
  absoluteImageUrl,
  buildCatalogCsv,
  buildCatalogDescription,
  buildCatalogTitle,
  catalogGender,
  formatCatalogPrice,
  itemGroupId,
  sortedCatalogImages,
  type CatalogFragranceRow,
} from "./product-feed-shared";

const GOOGLE_SHOPPING_COLUMNS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "availability",
  "price",
  "brand",
  "condition",
  "google_product_category",
  "gender",
  "size",
  "item_group_id",
  "mpn",
  "identifier_exists",
  "additional_image_link",
  "product_type",
  "age_group",
  "canonical_link",
  "shipping",
] as const;

function googleShipping(): string {
  return (
    process.env.GOOGLE_SHOPPING_SHIPPING?.trim() || "GH:::0.00 GHS"
  );
}

function googleAvailability(stock: number): string {
  return stock > 0 ? "in_stock" : "out_of_stock";
}

export function buildGoogleShoppingRow(
  fragrance: CatalogFragranceRow,
  currency: string
): Record<(typeof GOOGLE_SHOPPING_COLUMNS)[number], string> {
  const sortedImages = sortedCatalogImages(fragrance);
  const primaryImage = sortedImages[0]?.url || "/images/placeholders/fragrance.svg";
  const extraImages = sortedImages
    .slice(1, 10)
    .map((img) => absoluteImageUrl(img.url))
    .join(",");

  return {
    id: fragrance.id,
    title: buildCatalogTitle(fragrance),
    description: buildCatalogDescription(fragrance),
    link: absoluteUrl(`/fragrances/${fragrance.slug}`),
    image_link: absoluteImageUrl(primaryImage),
    availability: googleAvailability(fragrance.stock),
    price: formatCatalogPrice(fragrance.price, currency),
    brand: SELLER_BRAND,
    condition: "new",
    google_product_category: GOOGLE_PRODUCT_CATEGORY,
    gender: catalogGender(fragrance.gender),
    size: `${fragrance.bottleSize} ml`,
    item_group_id: itemGroupId(fragrance),
    mpn: fragrance.reference,
    identifier_exists: "no",
    additional_image_link: extraImages,
    product_type: `Oil Perfume > ${fragrance.fragranceFamily}`,
    age_group: "adult",
    canonical_link: absoluteUrl(`/fragrances/${fragrance.slug}`),
    shipping: googleShipping(),
  };
}

export function buildGoogleShoppingCsv(
  fragrances: CatalogFragranceRow[],
  currency = "GHS"
): string {
  const rows = fragrances
    .filter((fragrance) => fragrance.images.length > 0)
    .map((fragrance) => buildGoogleShoppingRow(fragrance, currency));
  return buildCatalogCsv(GOOGLE_SHOPPING_COLUMNS, rows);
}

export type { CatalogFragranceRow } from "./product-feed-shared";
