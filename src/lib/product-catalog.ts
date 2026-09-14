import type { ProductType } from "@prisma/client";

export type CatalogSlug = "fragrances" | "watches" | "sneakers" | "shirts" | "sunglasses";

export type CatalogConfig = {
  slug: CatalogSlug;
  productType: ProductType;
  path: string;
  label: string;
  title: string;
  description: string;
  emptyMessage: string;
  /** Show scent-family, concentration, bottle-size filters. */
  perfumeFilters: boolean;
};

export const CATALOGS: Record<CatalogSlug, CatalogConfig> = {
  fragrances: {
    slug: "fragrances",
    productType: "PERFUME",
    path: "/fragrances",
    label: "Perfumes",
    title: "Shop Luxury Perfumes & Artisan Fragrances",
    description:
      "Browse handcrafted oil-based perfume oils - sustainable, vegan, alcohol-free options inspired by Grasse. Secure checkout at COSY AURA.",
    emptyMessage: "No fragrances found matching your criteria.",
    perfumeFilters: true,
  },
  watches: {
    slug: "watches",
    productType: "WATCH",
    path: "/watches",
    label: "Watches",
    title: "Shop Luxury Watches",
    description:
      "Discover curated luxury and everyday watches at COSY AURA. Authentic pieces with secure checkout.",
    emptyMessage: "No watches found matching your criteria.",
    perfumeFilters: false,
  },
  sneakers: {
    slug: "sneakers",
    productType: "SNEAKER",
    path: "/sneakers",
    label: "Sneakers",
    title: "Shop Sneakers",
    description:
      "Browse premium sneakers and limited releases at COSY AURA.",
    emptyMessage: "No sneakers found matching your criteria.",
    perfumeFilters: false,
  },
  shirts: {
    slug: "shirts",
    productType: "SHIRT",
    path: "/shirts",
    label: "Shirts",
    title: "Shop Shirts & Tops",
    description:
      "Explore shirts and tops from selected brands at COSY AURA.",
    emptyMessage: "No shirts found matching your criteria.",
    perfumeFilters: false,
  },
  sunglasses: {
    slug: "sunglasses",
    productType: "SUNGLASSES",
    path: "/sunglasses",
    label: "Sunglasses",
    title: "Shop Sunglasses",
    description:
      "Find designer and everyday sunglasses at COSY AURA.",
    emptyMessage: "No sunglasses found matching your criteria.",
    perfumeFilters: false,
  },
};

/** Non-perfume shop categories shown in navigation. */
export const FASHION_CATALOGS: CatalogSlug[] = [
  "watches",
  "sneakers",
  "shirts",
  "sunglasses",
];

export function getCatalog(slug: CatalogSlug): CatalogConfig {
  return CATALOGS[slug];
}

export function catalogForProductType(productType: ProductType): CatalogConfig {
  const match = Object.values(CATALOGS).find((c) => c.productType === productType);
  return match ?? CATALOGS.fragrances;
}

export function productDetailPath(productType: ProductType, slug: string): string {
  return `${catalogForProductType(productType).path}/${slug}`;
}

export const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "PERFUME", label: "Perfume" },
  { value: "WATCH", label: "Watch" },
  { value: "SNEAKER", label: "Sneaker" },
  { value: "SHIRT", label: "Shirt" },
  { value: "SUNGLASSES", label: "Sunglasses" },
];

export function isPerfumeProduct(productType?: ProductType | null): boolean {
  return !productType || productType === "PERFUME";
}

const CATALOG_PLACEHOLDERS: Partial<Record<ProductType, string>> = {
  WATCH: "/images/placeholders/watch.svg",
};

export function catalogPlaceholder(productType: ProductType): string {
  return CATALOG_PLACEHOLDERS[productType] ?? "/images/placeholders/watch.svg";
}

export const CATALOG_PRODUCT_PROMISES = [
  "Boxed",
  "Online Store",
  "Next day delivery",
] as const;
