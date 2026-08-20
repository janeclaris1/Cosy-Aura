/** Shared perfume PLP filter options (Step 7) */

export const FRAGRANCE_FAMILY_OPTIONS = [
  { value: "FLORAL", label: "Floral" },
  { value: "ORIENTAL", label: "Oriental" },
  { value: "WOODY", label: "Woody" },
  { value: "FRESH", label: "Fresh" },
  { value: "CITRUS", label: "Citrus" },
  { value: "SPICY", label: "Spicy" },
] as const;

export const CONCENTRATION_OPTIONS = [
  { value: "EDT", label: "Light Oil" },
  { value: "EDP", label: "EDP" },
  { value: "PARFUM", label: "Intense Oil" },
  { value: "EXTRAIT", label: "Pure Oil" },
] as const;

export const LONGEVITY_OPTIONS = [
  { value: "4-6hrs", label: "4-6 hrs" },
  { value: "6-8hrs", label: "6-8 hrs" },
  { value: "8-10hrs", label: "8-10 hrs" },
  { value: "10hrs+", label: "10 hrs+" },
] as const;

export const BOTTLE_SIZE_OPTIONS = [
  { value: "30", label: "30 ml" },
  { value: "50", label: "50 ml" },
  { value: "100", label: "100 ml" },
] as const;

export const SILLAGE_OPTIONS = [
  { value: "SUBTLE", label: "Subtle" },
  { value: "MODERATE", label: "Moderate" },
  { value: "INTENSE", label: "Intense" },
  { value: "POWERFUL", label: "Powerful" },
] as const;

export const GENDER_OPTIONS = [
  { value: "MENS", label: "Men" },
  { value: "WOMENS", label: "Women" },
  { value: "UNISEX", label: "Unisex" },
] as const;

export const COLLECTION_OPTIONS = [
  { value: "Signature", label: "Signature" },
  { value: "Summer", label: "Summer" },
  { value: "Winter", label: "Winter" },
  { value: "Artisan", label: "Artisan" },
] as const;

export const SUSTAINABILITY_OPTIONS = [
  { value: "vegan", label: "Vegan" },
  { value: "cruelty-free", label: "Cruelty-Free" },
  { value: "sustainable", label: "Sustainable" },
] as const;

export const PRICE_RANGE_OPTIONS = [
  { label: "Under $50", min: null as string | null, max: "50" },
  { label: "$50 - $100", min: "50", max: "100" },
  { label: "$100 - $200", min: "100", max: "200" },
  { label: "$200+", min: "200", max: null as string | null },
] as const;

/** Map longevity filter tokens → substring patterns found in DB strings */
export const LONGEVITY_MATCHERS: Record<string, string[]> = {
  "4-6hrs": ["4-6", "4–6", "4 to 6", "5–7", "5-7"],
  "6-8hrs": ["6-8", "6–8", "6 to 8", "7–9", "7-9"],
  "8-10hrs": ["8-10", "8–10", "8 to 10", "8–12", "8-12", "9–"],
  "10hrs+": ["10+", "10–", "10-", "10 hrs", "12+", "12–", "12-", "14", "24", "all day"],
};

export const FILTER_CHIP_LABELS: Record<string, string> = {
  minPrice: "Min Price",
  maxPrice: "Max Price",
  fragranceFamily: "Fragrance Family",
  concentration: "Concentration",
  longevity: "Longevity",
  bottleSize: "Bottle Size",
  sillage: "Sillage",
  gender: "Gender",
  collection: "Collection",
  sustainability: "Sustainability",
  brand: "Brand",
  brandSlug: "Brand",
  series: "Series",
  category: "Category",
  sampleAvailable: "Sample",
  isVegan: "Vegan",
  isCrueltyFree: "Cruelty-Free",
};
