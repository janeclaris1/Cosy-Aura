/**
 * Canonical perfume product input (storefront / CMS shape) → Prisma Fragrance.
 *
 * Example:
 * {
 *   name: "Midnight Orchid",
 *   brand: "Noir Parfums",
 *   price: 89.99,
 *   bottleMaterial: "Handcrafted German Glass", // → bottleDetail + bottleMaterial enum
 *   fragranceFamily: "Oriental",                 // → ORIENTAL
 *   concentration: "Eau de Parfum",              // → EDP
 *   collection: "Signature Collection",
 *   yearLaunched: 2023,                          // → year
 *   ...
 * }
 */

export type PerfumeProductInput = {
  name: string;
  brand: string;
  price: number;
  description: string;
  bottleMaterial: string;
  liquidColor: string;
  fragranceFamily: string;
  longevity: string;
  bottleSize: 30 | 50 | 100;
  concentration: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  sillage: string;
  gender: string;
  collection: string;
  images: string[];
  stock: number;
  category: string;
  sustainabilityScore: number;
  isVegan: boolean;
  isCrueltyFree: boolean;
  sampleAvailable: boolean;
  yearLaunched: number;
  rating: number;
  reference?: string;
  capType?: string;
  bottleShape?: string;
};

const FAMILY_MAP: Record<string, string> = {
  floral: "FLORAL",
  oriental: "ORIENTAL",
  woody: "WOODY",
  fresh: "FRESH",
  citrus: "CITRUS",
  spicy: "SPICY",
};

const CONCENTRATION_MAP: Record<string, string> = {
  edt: "EDT",
  "eau de toilette": "EDT",
  edp: "EDP",
  "eau de parfum": "EDP",
  parfum: "PARFUM",
  extrait: "EXTRAIT",
};

const SILLAGE_MAP: Record<string, string> = {
  subtle: "SUBTLE",
  moderate: "MODERATE",
  intense: "INTENSE",
  powerful: "POWERFUL",
};

const GENDER_MAP: Record<string, string> = {
  men: "MENS",
  mens: "MENS",
  "men's": "MENS",
  women: "WOMENS",
  womens: "WOMENS",
  "women's": "WOMENS",
  unisex: "UNISEX",
};

function inferBottleMaterialEnum(detail: string): string {
  const d = detail.toLowerCase();
  if (d.includes("crystal")) return "CRYSTAL";
  if (d.includes("ceramic")) return "CERAMIC";
  if (d.includes("metal") || d.includes("aluminium") || d.includes("aluminum"))
    return "METAL";
  if (d.includes("acrylic") || d.includes("plastic")) return "ACRYLIC";
  return "GLASS";
}

/** Map a CMS/example product object into Prisma create/update fields (minus brandId/slug/images). */
export function mapPerfumeProductInput(input: PerfumeProductInput) {
  const familyKey = input.fragranceFamily.trim().toLowerCase();
  const concKey = input.concentration.trim().toLowerCase();
  const sillageKey = input.sillage.trim().toLowerCase();
  const genderKey = input.gender.trim().toLowerCase();

  return {
    model: input.name,
    reference:
      input.reference ||
      `${input.brand.slice(0, 3).toUpperCase()}-${input.name
        .replace(/\s+/g, "-")
        .toUpperCase()
        .slice(0, 12)}-${input.bottleSize}`,
    description: input.description,
    price: input.price,
    condition: "UNWORN" as const,
    year: input.yearLaunched,
    fragranceFamily: (FAMILY_MAP[familyKey] || "ORIENTAL") as
      | "FLORAL"
      | "ORIENTAL"
      | "WOODY"
      | "FRESH"
      | "CITRUS"
      | "SPICY",
    bottleMaterial: inferBottleMaterialEnum(input.bottleMaterial) as
      | "GLASS"
      | "CRYSTAL"
      | "METAL"
      | "CERAMIC"
      | "ACRYLIC",
    bottleDetail: input.bottleMaterial,
    bottleSize: input.bottleSize,
    capType: (input.capType?.toUpperCase().replace("-", "_") || "SPRAY") as
      | "MAGNETIC"
      | "SPRAY"
      | "DAB_ON"
      | "SCREW",
    liquidColor: input.liquidColor,
    longevity: input.longevity,
    bottleShape: input.bottleShape || "Round",
    concentration: (CONCENTRATION_MAP[concKey] || "EDP") as
      | "EDT"
      | "EDP"
      | "PARFUM"
      | "EXTRAIT",
    topNotes: input.topNotes,
    heartNotes: input.heartNotes,
    baseNotes: input.baseNotes,
    sillage: (SILLAGE_MAP[sillageKey] || "MODERATE") as
      | "SUBTLE"
      | "MODERATE"
      | "INTENSE"
      | "POWERFUL",
    gender: (GENDER_MAP[genderKey] || "UNISEX") as "MENS" | "WOMENS" | "UNISEX",
    collection: input.collection,
    stock: input.stock,
    rating: input.rating,
    category: input.category,
    sustainabilityScore: input.sustainabilityScore,
    isVegan: input.isVegan,
    isCrueltyFree: input.isCrueltyFree,
    sampleAvailable: input.sampleAvailable,
    imageUrls: input.images,
  };
}

/** Flagship example from the perfume migration brief */
export const MIDNIGHT_ORCHID: PerfumeProductInput = {
  name: "Midnight Orchid",
  brand: "Noir Parfums",
  price: 89.99,
  description:
    "A mysterious blend of black orchid, dark vanilla, and smoky oud. Perfect for evening elegance.",
  bottleMaterial: "Handcrafted German Glass",
  liquidColor: "Deep Amber with subtle gold shimmer",
  fragranceFamily: "Oriental",
  longevity: "8-10 hours",
  bottleSize: 50,
  concentration: "Eau de Parfum",
  topNotes: ["Black Pepper", "Saffron", "Cardamom"],
  heartNotes: ["Black Orchid", "Tuberose", "Rose"],
  baseNotes: ["Oud", "Vanilla Absolute", "Patchouli", "Benzoin"],
  sillage: "Intense",
  gender: "Unisex",
  collection: "Signature Collection",
  images: [
    "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=800&fit=crop",
  ],
  stock: 45,
  category: "Eau de Parfum",
  sustainabilityScore: 4,
  isVegan: true,
  isCrueltyFree: true,
  sampleAvailable: true,
  yearLaunched: 2023,
  rating: 4.8,
};
