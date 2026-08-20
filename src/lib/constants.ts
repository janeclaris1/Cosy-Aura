export const BRAND_COLORS = {
  primary: "#1c1917",
  primaryLight: "#3f3a35",
  secondary: "#d4d4d4",
  secondaryLight: "#ececec",
  accent: "#ffffff",
  highlight: "#a67c52",
  highlightLight: "#c4a574",
  background: "#ffffff",
  surface: "#ffffff",
  text: "#1c1917",
  textSecondary: "#6b6b6b",
  success: "#6f9a76",
  warning: "#c4a574",
  error: "#b56b6b",
} as const;

/**
 * Step 3 - Watch → Perfume terminology map (user-facing copy only).
 * Keep code identifiers (enums, Prisma fields) unchanged.
 */
export const TERMINOLOGY = {
  Watch: "Fragrance",
  Watches: "Fragrances",
  Timepiece: "Fragrance",
  "Precision Engineering": "Artisanal Craftsmanship",
  "Swiss Made": "Grasse Distilled",
  "Water Resistant": "Long-Lasting Sillage",
  "Water Resistance": "Long-Lasting Sillage",
  Chronograph: "Perfume Oil",
  Strap: "Bottle",
  Dial: "Flacon",
  Movement: "Fragrance Notes",
  Crystal: "Bottle Glass",
  Warranty: "Trial & Return",
  Automatic: "Pure Perfume Oil",
  Tourbillon: "Master Perfumer",
  Case: "Bottle Design",
  Crown: "Bottle Stopper",
  Lume: "Scent Trail",
  Tachymeter: "Sillage Radius",
  Horology: "Olfactory Art",
  Bezel: "Neck",
  Bracelet: "Bottle",
  Clasp: "Cap",
  Deployant: "Atomizer",
  "Haute Horlogerie": "Haute Parfumerie",
  "Sapphire Crystal": "Crystal Glass",
  "Stainless Steel": "Premium Glass",
  Titanium: "Luxury Packaging",
} as const;

/** Trust / marketing phrases used across the storefront */
export const BRAND_PHRASES = {
  craftsmanship: "Artisanal Craftsmanship",
  origin: "Grasse Distilled",
  longevity: "Long-Lasting Sillage",
  concentration: "Eau de Parfum",
  notes: "Fragrance Notes",
  trial: "Trial & Return",
  art: "Olfactory Art",
  haute: "Haute Parfumerie",
  glass: "Crystal Glass",
  packaging: "Premium Glass & Luxury Packaging",
  stopper: "Bottle Stopper",
  trail: "Scent Trail",
  sillage: "Sillage Radius",
  perfumer: "Master Perfumer",
} as const;
