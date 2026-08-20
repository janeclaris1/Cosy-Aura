const HOUSE_SLUGS = new Set(["cosy-aura"]);

const BRAND_IMAGES: Record<string, string> = {
  dior: "/images/inspired/brand-dior.png",
  chanel: "/images/inspired/brand-chanel.png",
  "tom-ford": "/images/inspired/brand-tom-ford.png",
  creed: "/images/inspired/brand-creed.png",
  ysl: "/images/inspired/brand-ysl.png",
  "le-labo": "/images/inspired/brand-le-labo.png",
  "louis-vuitton": "/images/inspired/brand-louis-vuitton.png",
  amouage: "/images/inspired/brand-amouage.png",
  armaf: "/images/inspired/brand-armaf.png",
};

/** Closest signature bottle when a brand has no dedicated original photo yet. */
const BRAND_ALIASES: Record<string, string> = {
  gucci: "chanel",
  lancome: "chanel",
  burberry: "chanel",
  escada: "chanel",
  "nina-ricci": "chanel",
  "giorgio-armani": "dior",
  davidoff: "dior",
  "hugo-boss": "dior",
  "ralph-lauren": "dior",
  azzaro: "dior",
  "cristiano-ronaldo": "dior",
  hermes: "creed",
  "acqua-di-parma": "creed",
  atkinsons: "creed",
  byredo: "le-labo",
  "calvin-klein": "le-labo",
  "maison-margiela": "le-labo",
  mancera: "louis-vuitton",
  "maison-francis-kurkdjian": "louis-vuitton",
  "ex-nihilo": "louis-vuitton",
  jpg: "ysl",
  "paco-rabanne": "ysl",
  "victorias-secret": "ysl",
  "jimmy-choo": "ysl",
  kayali: "ysl",
  beyonce: "ysl",
  montale: "amouage",
  "maison-crivelli": "amouage",
  "clive-christian": "amouage",
  "arabian-oud": "amouage",
  shay: "amouage",
  asq: "amouage",
  immortals: "amouage",
};

const FALLBACK = "/images/inspired/fallback.png";

export function isHouseOriginal(brandSlug?: string | null): boolean {
  return !!brandSlug && HOUSE_SLUGS.has(brandSlug);
}

export function inspiredByOriginalLabel(brand: string, model: string): string {
  return `${brand} ${model}`.toUpperCase();
}

export function inspiredByLine(brand: string, model?: string): string {
  return model ? `(Inspired by ${brand} ${model})` : `(Inspired by ${brand})`;
}

export function cardConcentrationLabel(concentration?: string | null): string {
  if (concentration === "EDP") return "EDP";
  if (concentration === "EDT") return "EDT";
  if (concentration === "EXTRAIT") return "Extrait";
  return "Oil Based";
}

export function inspiredByImageSrc(brandSlug?: string | null): string {
  const slug = brandSlug || "";
  if (BRAND_IMAGES[slug]) return BRAND_IMAGES[slug];
  const alias = BRAND_ALIASES[slug];
  if (alias && BRAND_IMAGES[alias]) return BRAND_IMAGES[alias];
  return FALLBACK;
}
