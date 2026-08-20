import { absoluteUrl } from "@/lib/seo";
import {
  GOOGLE_PRODUCT_CATEGORY_LABEL,
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

const META_CATALOG_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "google_product_category",
  "fb_product_category",
  "size",
  "gender",
  "item_group_id",
  "additional_image_link",
  "product_type",
] as const;

function metaAvailability(stock: number): string {
  return stock > 0 ? "in stock" : "out of stock";
}

export function buildMetaCatalogRow(
  fragrance: CatalogFragranceRow,
  currency: string
): Record<(typeof META_CATALOG_COLUMNS)[number], string> {
  const sortedImages = sortedCatalogImages(fragrance);
  const primaryImage = sortedImages[0]?.url || "/images/placeholders/fragrance.svg";
  const extraImages = sortedImages
    .slice(1, 5)
    .map((img) => absoluteImageUrl(img.url))
    .join(",");

  return {
    id: fragrance.id,
    title: buildCatalogTitle(fragrance),
    description: buildCatalogDescription(fragrance),
    availability: metaAvailability(fragrance.stock),
    condition: "new",
    price: formatCatalogPrice(fragrance.price, currency),
    link: absoluteUrl(`/fragrances/${fragrance.slug}`),
    image_link: absoluteImageUrl(primaryImage),
    brand: SELLER_BRAND,
    google_product_category: GOOGLE_PRODUCT_CATEGORY_LABEL,
    fb_product_category: GOOGLE_PRODUCT_CATEGORY_LABEL,
    size: `${fragrance.bottleSize} ml`,
    gender: catalogGender(fragrance.gender),
    item_group_id: itemGroupId(fragrance),
    additional_image_link: extraImages,
    product_type: `Oil Perfume > ${fragrance.fragranceFamily}`,
  };
}

export function buildMetaCatalogCsv(
  fragrances: CatalogFragranceRow[],
  currency = "GHS"
): string {
  const rows = fragrances.map((fragrance) => buildMetaCatalogRow(fragrance, currency));
  return buildCatalogCsv(META_CATALOG_COLUMNS, rows);
}

export type { CatalogFragranceRow } from "./product-feed-shared";
