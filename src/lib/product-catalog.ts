import type { ProductType } from "@prisma/client";

export type CatalogSlug =
  | "fragrances"
  | "watches"
  | "sneakers"
  | "shirts"
  | "sunglasses"
  | "rings"
  | "bracelets"
  | "necklaces"
  | "belts"
  | "wallets"
  | "bags";

export type CatalogConfig = {
  slug: CatalogSlug;
  productType: ProductType;
  path: string;
  label: string;
  /** Admin sidebar and list page title (e.g. Fragrances, not Perfumes). */
  adminLabel: string;
  adminAddLabel: string;
  title: string;
  description: string;
  /** Copy for the catalog showroom hero (e.g. "curated luxury watches"). */
  showroomTeaser: string;
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
    adminLabel: "Fragrances",
    adminAddLabel: "Add fragrance",
    title: "Shop Luxury Perfumes & Artisan Fragrances",
    description:
      "Browse handcrafted oil-based perfume oils - sustainable, vegan, alcohol-free options inspired by Grasse. Secure checkout at COSY AURA.",
    showroomTeaser: "handcrafted perfume oils and artisan fragrances",
    emptyMessage: "No fragrances found matching your criteria.",
    perfumeFilters: true,
  },
  watches: {
    slug: "watches",
    productType: "WATCH",
    path: "/watches",
    label: "Watches",
    adminLabel: "Watches",
    adminAddLabel: "Add watch",
    title: "Shop Luxury Watches",
    description:
      "Discover curated luxury and everyday watches at COSY AURA. Authentic pieces with secure checkout.",
    showroomTeaser: "curated luxury watches",
    emptyMessage: "No watches found matching your criteria.",
    perfumeFilters: false,
  },
  sneakers: {
    slug: "sneakers",
    productType: "SNEAKER",
    path: "/sneakers",
    label: "Sneakers",
    adminLabel: "Sneakers",
    adminAddLabel: "Add sneaker",
    title: "Shop Sneakers",
    description:
      "Browse premium sneakers and limited releases at COSY AURA.",
    showroomTeaser: "premium sneakers and limited releases",
    emptyMessage: "No sneakers found matching your criteria.",
    perfumeFilters: false,
  },
  shirts: {
    slug: "shirts",
    productType: "SHIRT",
    path: "/shirts",
    label: "Shirts",
    adminLabel: "Shirts",
    adminAddLabel: "Add shirt",
    title: "Shop Shirts & Tops",
    description:
      "Explore shirts and tops from selected brands at COSY AURA.",
    showroomTeaser: "shirts and tops from selected brands",
    emptyMessage: "No shirts found matching your criteria.",
    perfumeFilters: false,
  },
  sunglasses: {
    slug: "sunglasses",
    productType: "SUNGLASSES",
    path: "/sunglasses",
    label: "Sunglasses",
    adminLabel: "Sunglasses",
    adminAddLabel: "Add sunglasses",
    title: "Shop Sunglasses",
    description:
      "Find designer and everyday sunglasses at COSY AURA.",
    showroomTeaser: "designer and everyday sunglasses",
    emptyMessage: "No sunglasses found matching your criteria.",
    perfumeFilters: false,
  },
  rings: {
    slug: "rings",
    productType: "RING",
    path: "/rings",
    label: "Rings",
    adminLabel: "Rings",
    adminAddLabel: "Add ring",
    title: "Shop Rings for Men & Women",
    description:
      "Discover rings for every occasion — from everyday bands to statement pieces for men and women.",
    showroomTeaser: "rings for every occasion",
    emptyMessage: "No rings found matching your criteria.",
    perfumeFilters: false,
  },
  bracelets: {
    slug: "bracelets",
    productType: "BRACELET",
    path: "/bracelets",
    label: "Bracelets",
    adminLabel: "Bracelets",
    adminAddLabel: "Add bracelet",
    title: "Shop Bracelets for Men & Women",
    description:
      "Browse bracelets and bangles for men and women — chain, cuff, tennis, and charm styles.",
    showroomTeaser: "bracelets and bangles for men and women",
    emptyMessage: "No bracelets found matching your criteria.",
    perfumeFilters: false,
  },
  necklaces: {
    slug: "necklaces",
    productType: "NECKLACE",
    path: "/necklaces",
    label: "Necklaces",
    adminLabel: "Necklaces",
    adminAddLabel: "Add necklace",
    title: "Shop Necklaces for Men & Women",
    description:
      "Explore necklaces and pendants for men and women — chains, layers, and fine jewelry.",
    showroomTeaser: "necklaces and pendants for men and women",
    emptyMessage: "No necklaces found matching your criteria.",
    perfumeFilters: false,
  },
  belts: {
    slug: "belts",
    productType: "BELT",
    path: "/belts",
    label: "Belts",
    adminLabel: "Belts",
    adminAddLabel: "Add belt",
    title: "Shop Belts for Men & Women",
    description:
      "Find leather and designer belts for men and women to finish any look.",
    showroomTeaser: "leather and designer belts",
    emptyMessage: "No belts found matching your criteria.",
    perfumeFilters: false,
  },
  wallets: {
    slug: "wallets",
    productType: "WALLET",
    path: "/wallets",
    label: "Wallets",
    adminLabel: "Wallets",
    adminAddLabel: "Add wallet",
    title: "Shop Wallets for Men & Women",
    description:
      "Browse wallets and card holders for men and women — leather, zip-around, and slim designs.",
    showroomTeaser: "wallets and card holders",
    emptyMessage: "No wallets found matching your criteria.",
    perfumeFilters: false,
  },
  bags: {
    slug: "bags",
    productType: "BAG",
    path: "/bags",
    label: "Bags",
    adminLabel: "Bags",
    adminAddLabel: "Add bag",
    title: "Shop Bags for Men & Women",
    description:
      "Discover bags for men and women — totes, crossbody, shoulder bags, and backpacks.",
    showroomTeaser: "bags for men and women",
    emptyMessage: "No bags found matching your criteria.",
    perfumeFilters: false,
  },
};

/** Jewelry verticals in navigation. */
export const JEWELRY_CATALOGS: CatalogSlug[] = ["rings", "bracelets", "necklaces"];

/** Leather goods & carry verticals. */
export const LEATHER_CATALOGS: CatalogSlug[] = ["belts", "wallets", "bags"];

/** All catalog verticals — admin sidebar and catalogue management. */
export const ADMIN_CATALOG_SLUGS: CatalogSlug[] = [
  "fragrances",
  "watches",
  "sneakers",
  "shirts",
  "sunglasses",
  ...JEWELRY_CATALOGS,
  ...LEATHER_CATALOGS,
];

export function adminCatalogPath(slug: CatalogSlug): string {
  return `/admin/${slug}`;
}

/** Non-perfume shop categories shown in navigation. */
export const FASHION_CATALOGS: CatalogSlug[] = [
  "watches",
  "sneakers",
  "shirts",
  "sunglasses",
  ...JEWELRY_CATALOGS,
  ...LEATHER_CATALOGS,
];

export function getCatalog(slug: CatalogSlug): CatalogConfig {
  return CATALOGS[slug];
}

export function catalogContainerId(slug: CatalogSlug): string {
  return `${slug}-catalog`;
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
  { value: "RING", label: "Ring" },
  { value: "BRACELET", label: "Bracelet" },
  { value: "NECKLACE", label: "Necklace" },
  { value: "BELT", label: "Belt" },
  { value: "WALLET", label: "Wallet" },
  { value: "BAG", label: "Bag" },
];

export const CATALOG_PRODUCT_TYPES: ProductType[] = PRODUCT_TYPE_OPTIONS.map(
  (o) => o.value
);

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
