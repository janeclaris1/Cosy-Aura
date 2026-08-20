import type { Brand, Fragrance, FragranceCountryStock, FragranceImage } from "@prisma/client";

export type FragranceWithRelations = Fragrance & {
  brand: Brand;
  images: FragranceImage[];
  countryStocks?: FragranceCountryStock[];
};

export const fragranceListInclude = {
  brand: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  countryStocks: true,
} as const;

export const FRAGRANCE_PAGE_SIZE = 18;

export interface FragranceListFilters {
  brandSlug?: string;
  seriesSlug?: string;
  bottleSize?: number;
  bottleSizes?: number[];
  minPrice?: number;
  maxPrice?: number;
  conditions?: string[];
  fragranceFamilies?: string[];
  bottleMaterials?: string[];
  capTypes?: string[];
  concentrations?: string[];
  longevities?: string[];
  sillages?: string[];
  collections?: string[];
  genders?: string[];
  sustainability?: string[];
  minYear?: number;
  maxYear?: number;
  sort?: string;
  page?: number;
  limit?: number;
  gender?: string;
  category?: string;
  sampleAvailable?: boolean;
  isCrueltyFree?: boolean;
  isVegan?: boolean;
}

const VALID_BOTTLE_SIZES = [30, 50, 100] as const;
const MIN_VALID_YEAR = 1950;
const MAX_VALID_YEAR = new Date().getFullYear() + 1;

export function isRealisticBottleSize(size: number | null | undefined): boolean {
  return (
    typeof size === "number" &&
    VALID_BOTTLE_SIZES.includes(size as (typeof VALID_BOTTLE_SIZES)[number])
  );
}

export function isRealisticYear(year: number | null | undefined): boolean {
  return (
    typeof year === "number" &&
    Number.isFinite(year) &&
    year >= MIN_VALID_YEAR &&
    year <= MAX_VALID_YEAR
  );
}

export function parseFragranceListFilters(
  searchParams: URLSearchParams | Record<string, string | undefined>,
  overrides: Partial<FragranceListFilters> = {}
): FragranceListFilters {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    return searchParams[key];
  };

  const bottleSizeRaw = get("bottleSize");
  const bottleSizes = bottleSizeRaw
    ?.split(",")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  const genders = get("gender")?.split(",").filter(Boolean);
  const sustainability = get("sustainability")?.split(",").filter(Boolean);

  return {
    brandSlug: overrides.brandSlug ?? get("brandSlug") ?? get("brand"),
    seriesSlug: get("series"),
    bottleSize: bottleSizes?.length === 1 ? bottleSizes[0] : undefined,
    bottleSizes: bottleSizes?.length ? bottleSizes : undefined,
    minPrice: get("minPrice") ? Number(get("minPrice")) : undefined,
    maxPrice: get("maxPrice") ? Number(get("maxPrice")) : undefined,
    conditions: get("condition")?.split(",").filter(Boolean),
    fragranceFamilies: get("fragranceFamily")?.split(",").filter(Boolean),
    bottleMaterials: get("bottleMaterial")?.split(",").filter(Boolean),
    capTypes: get("capType")?.split(",").filter(Boolean),
    concentrations: get("concentration")?.split(",").filter(Boolean),
    longevities: get("longevity")?.split(",").filter(Boolean),
    sillages: get("sillage")?.split(",").filter(Boolean),
    collections: get("collection")?.split(",").filter(Boolean),
    genders,
    gender: genders?.length === 1 ? genders[0] : undefined,
    sustainability,
    minYear: get("minYear") ? Number(get("minYear")) : undefined,
    maxYear: get("maxYear") ? Number(get("maxYear")) : undefined,
    sort: get("sort"),
    page: overrides.page ?? (get("page") ? Number(get("page")) : 1),
    limit:
      overrides.limit ??
      (get("limit") ? Number(get("limit")) : FRAGRANCE_PAGE_SIZE),
    category: get("category"),
    sampleAvailable:
      get("sampleAvailable") === "true"
        ? true
        : get("sampleAvailable") === "false"
          ? false
          : undefined,
    isCrueltyFree:
      get("isCrueltyFree") === "true" || sustainability?.includes("cruelty-free")
        ? true
        : get("isCrueltyFree") === "false"
          ? false
          : undefined,
    isVegan:
      get("isVegan") === "true" || sustainability?.includes("vegan")
        ? true
        : get("isVegan") === "false"
          ? false
          : undefined,
  };
}
