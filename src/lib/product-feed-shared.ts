import type { Brand, Fragrance, FragranceImage, Gender } from "@prisma/client";
import { SITE_NAME, absoluteUrl, siteUrl } from "@/lib/seo";
import { inspiredByLine } from "@/lib/inspired-by";

export type CatalogFragranceRow = Fragrance & {
  brand: Brand;
  images: FragranceImage[];
};

export const SELLER_BRAND = SITE_NAME;
export const GOOGLE_PRODUCT_CATEGORY = "479";
export const GOOGLE_PRODUCT_CATEGORY_LABEL =
  "Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne";

export function csvEscape(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function catalogGender(gender: Gender): string {
  switch (gender) {
    case "MENS":
      return "male";
    case "WOMENS":
      return "female";
    default:
      return "unisex";
  }
}

export function absoluteImageUrl(url: string): string {
  return url.startsWith("http") ? url : absoluteUrl(url);
}

export function buildCatalogTitle(fragrance: CatalogFragranceRow): string {
  const inspired = inspiredByLine(fragrance.brand.name, fragrance.model);
  return `${SELLER_BRAND} ${fragrance.model} Oil Perfume (${fragrance.bottleSize}ml) ${inspired}`.slice(
    0,
    150
  );
}

export function buildCatalogDescription(fragrance: CatalogFragranceRow): string {
  const inspired = inspiredByLine(fragrance.brand.name, fragrance.model);
  const notes = [
    ...fragrance.topNotes,
    ...fragrance.heartNotes,
    ...fragrance.baseNotes,
  ]
    .slice(0, 12)
    .join(", ");

  const parts = [
    fragrance.description.trim(),
    inspired,
    `Concentration: ${fragrance.concentration.replace(/_/g, " ")}.`,
    `Bottle size: ${fragrance.bottleSize} ml.`,
    notes ? `Notes: ${notes}.` : "",
    `Alcohol-free oil perfume. Checkout on ${new URL(siteUrl()).host.replace(/^www\./, "")}.`,
  ].filter(Boolean);

  return parts.join(" ").slice(0, 4999);
}

export function itemGroupId(fragrance: CatalogFragranceRow): string {
  return `${fragrance.brand.slug}-${fragrance.model.toLowerCase().replace(/\s+/g, "-")}`;
}

export function sortedCatalogImages(fragrance: CatalogFragranceRow) {
  return [...fragrance.images].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder
  );
}

export function formatCatalogPrice(price: number, currency: string): string {
  return `${price.toFixed(2)} ${currency}`;
}

export function buildCatalogCsv<T extends string>(
  columns: readonly T[],
  rows: Record<T, string>[]
): string {
  const header = columns.join(",");
  const body = rows.map((record) =>
    columns.map((column) => csvEscape(record[column])).join(",")
  );
  return [header, ...body].join("\n");
}
