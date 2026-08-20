/** Heuristic scent intelligence for Virtual Nose, occasions, seasons, gifts, ingredients */

export type NoteOrigin = {
  note: string;
  region: string;
  lat: number;
  lng: number;
  story: string;
};

const ORIGIN_DB: NoteOrigin[] = [
  {
    note: "Rose",
    region: "Grasse, France",
    lat: 43.658,
    lng: 6.922,
    story: "Centifolia roses from the hills above Grasse - the historic heart of haute parfumerie.",
  },
  {
    note: "Jasmine",
    region: "Grasse, France",
    lat: 43.658,
    lng: 6.922,
    story: "Night-blooming jasmine absolute, hand-picked at dawn for luminous florals.",
  },
  {
    note: "Bergamot",
    region: "Calabria, Italy",
    lat: 38.115,
    lng: 15.65,
    story: "Calabrian bergamot peel oils bring sparkling citrus openings.",
  },
  {
    note: "Oud",
    region: "Assam, India",
    lat: 26.2,
    lng: 92.94,
    story: "Agarwood resin from Southeast Asia - dense, smoky, and precious.",
  },
  {
    note: "Vanilla",
    region: "Madagascar",
    lat: -18.77,
    lng: 46.87,
    story: "Bourbon vanilla pods cured under the Indian Ocean sun.",
  },
  {
    note: "Sandalwood",
    region: "Mysore, India",
    lat: 12.3,
    lng: 76.65,
    story: "Creamy Mysore sandalwood - the classic Oriental base.",
  },
  {
    note: "Iris",
    region: "Tuscany, Italy",
    lat: 43.77,
    lng: 11.25,
    story: "Orris butter aged for years from Tuscan iris rhizomes.",
  },
  {
    note: "Patchouli",
    region: "Indonesia",
    lat: -0.79,
    lng: 113.92,
    story: "Earthy Indonesian patchouli leaves for depth and projection.",
  },
  {
    note: "Frankincense",
    region: "Oman",
    lat: 21.47,
    lng: 55.98,
    story: "Boswellia resin from the Arabian peninsula - sacred and airy.",
  },
  {
    note: "Vetiver",
    region: "Haiti",
    lat: 18.97,
    lng: -72.29,
    story: "Haitian vetiver roots - smoky green elegance.",
  },
  {
    note: "Orange Blossom",
    region: "Tunisia",
    lat: 33.89,
    lng: 9.54,
    story: "Neroli and orange blossom absolute from Mediterranean groves.",
  },
  {
    note: "Saffron",
    region: "Kashmir",
    lat: 34.08,
    lng: 74.8,
    story: "Hand-harvested saffron threads for spicy golden warmth.",
  },
];

export function originsForNotes(notes: string[]): NoteOrigin[] {
  const found: NoteOrigin[] = [];
  const lower = notes.map((n) => n.toLowerCase());
  for (const origin of ORIGIN_DB) {
    if (lower.some((n) => n.includes(origin.note.toLowerCase()))) {
      found.push(origin);
    }
  }
  return found;
}

export function allIngredientOrigins() {
  return ORIGIN_DB;
}

const FAMILY_VOICE: Record<string, string[]> = {
  FLORAL: ["blooming", "petaled", "romantic", "powdered"],
  ORIENTAL: ["resinous", "sensual", "ambered", "nocturnal"],
  WOODY: ["grounded", "polished", "cedar-warm", "architectural"],
  FRESH: ["air-washed", "crisp", "ozonic", "effortless"],
  CITRUS: ["sparkling", "zesty", "sunlit", "effervescent"],
  SPICY: ["peppered", "incandescent", "aromatic", "magnetic"],
};

const SILLAGE_VOICE: Record<string, string> = {
  SUBTLE: "a soft aura that stays close to skin",
  MODERATE: "a polished trail that announces without shouting",
  INTENSE: "a confident cloud that fills a room",
  POWERFUL: "a dramatic projection that lingers long after you leave",
};

export function describeScent(input: {
  model: string;
  brand: string;
  fragranceFamily: string;
  concentration: string;
  sillage: string;
  longevity?: string | null;
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
}): { headline: string; paragraphs: string[]; tags: string[] } {
  const family = input.fragranceFamily.toUpperCase();
  const voice = FAMILY_VOICE[family] || ["nuanced", "composed", "memorable"];
  const top = (input.topNotes || []).slice(0, 3);
  const heart = (input.heartNotes || []).slice(0, 3);
  const base = (input.baseNotes || []).slice(0, 3);
  const sillage =
    SILLAGE_VOICE[input.sillage.toUpperCase()] ||
    "a balanced presence on skin and fabric";

  const headline = `${input.brand} ${input.model} - ${voice[0]} ${family.toLowerCase()} oil`;

  const paragraphs = [
    `The opening feels ${voice[1] || "bright"}, led by ${
      top.length ? top.join(", ") : "a vivid citrus-floral lift"
    }. It settles into a ${voice[2] || "composed"} heart of ${
      heart.length ? heart.join(", ") : "blooming florals"
    }, then anchors on ${
      base.length ? base.join(", ") : "warm woods and musk"
    }.`,
    `Wear character: ${sillage}. As an oil-based, alcohol-free perfume oil, longevity reads as ${
      input.longevity || "a full-day companion"
    } - intimate on skin, evolving rather than evaporating flat.`,
    `In our atelier reading, this is a ${voice[3] || "signature"} oil composition: modern enough for daily rotation, refined enough for evenings that ask for more.`,
  ];

  const tags = [
    "oil-based",
    "alcohol-free",
    family.toLowerCase(),
    input.concentration,
    input.sillage.toLowerCase(),
    ...voice.slice(0, 2),
  ];

  return { headline, paragraphs, tags };
}

export const OCCASIONS = [
  {
    id: "date-night",
    label: "Date Night",
    blurb: "Warm, intimate trails with soft projection.",
    families: ["ORIENTAL", "FLORAL", "WOODY"],
    sillage: ["SUBTLE", "MODERATE"],
  },
  {
    id: "office",
    label: "Office",
    blurb: "Clean, polite auras that stay desk-friendly.",
    families: ["FRESH", "CITRUS", "WOODY"],
    sillage: ["SUBTLE", "MODERATE"],
  },
  {
    id: "weekend",
    label: "Weekend",
    blurb: "Easy, expressive scents for markets and walks.",
    families: ["FRESH", "CITRUS", "FLORAL", "SPICY"],
    sillage: ["MODERATE", "INTENSE"],
  },
  {
    id: "evening-gala",
    label: "Evening Gala",
    blurb: "Statement bottles with lasting drama.",
    families: ["ORIENTAL", "WOODY", "SPICY"],
    sillage: ["INTENSE", "POWERFUL"],
  },
  {
    id: "gym-fresh",
    label: "Post-Gym Fresh",
    blurb: "Airy and light after movement.",
    families: ["FRESH", "CITRUS"],
    sillage: ["SUBTLE"],
  },
] as const;

export const SEASONS = [
  {
    id: "spring",
    label: "Spring",
    blurb: "Green florals and soft citrus as the air warms.",
    families: ["FLORAL", "FRESH", "CITRUS"],
    tips: [
      "Reach for bergamot and blossom openings.",
      "Keep sillage moderate - spring air carries scent farther.",
      "Layer a light floral over a clean musk.",
    ],
  },
  {
    id: "summer",
    label: "Summer",
    blurb: "Aquatic freshness and sunlit citrus for heat.",
    families: ["CITRUS", "FRESH"],
    tips: [
      "Spray lightly - heat amplifies projection.",
      "Citrus and ozonic notes feel cooler on skin.",
      "Save heavy oud for air-conditioned evenings.",
    ],
  },
  {
    id: "autumn",
    label: "Autumn",
    blurb: "Spice, woods, and amber as nights lengthen.",
    families: ["WOODY", "SPICY", "ORIENTAL"],
    tips: [
      "Lean into spice and dried fruit facets.",
      "Woods pair beautifully with knitwear.",
      "A touch of vanilla softens cooler evenings.",
    ],
  },
  {
    id: "winter",
    label: "Winter",
    blurb: "Resinous, creamy, and enveloping compositions.",
    families: ["ORIENTAL", "WOODY", "SPICY"],
    tips: [
      "Cold air muffles scent - richer bases shine.",
      "Oud, incense, and vanilla feel cocooning.",
      "Apply to pulse points under coats for slow release.",
    ],
  },
] as const;

export const GIFT_PERSONAS = [
  {
    id: "minimalist",
    label: "The Minimalist",
    blurb: "Clean lines, quiet confidence, no fuss.",
    families: ["FRESH", "CITRUS", "WOODY"],
    concentration: ["EDT", "EDP"],
  },
  {
    id: "romantic",
    label: "The Romantic",
    blurb: "Soft florals and intimate evenings.",
    families: ["FLORAL", "ORIENTAL"],
    concentration: ["EDP", "PARFUM"],
  },
  {
    id: "trailblazer",
    label: "The Trailblazer",
    blurb: "Bold statements and memorable entrances.",
    families: ["ORIENTAL", "SPICY", "WOODY"],
    concentration: ["EDP", "PARFUM", "EXTRAIT"],
  },
  {
    id: "naturalist",
    label: "The Naturalist",
    blurb: "Green, thoughtful, ingredient-curious.",
    families: ["FRESH", "WOODY", "CITRUS"],
    concentration: ["EDT", "EDP"],
  },
  {
    id: "classicist",
    label: "The Classicist",
    blurb: "Timeless signatures with heritage polish.",
    families: ["FLORAL", "WOODY", "ORIENTAL"],
    concentration: ["EDP", "PARFUM"],
  },
] as const;

export const PERFUMER_STORIES = [
  {
    slug: "camille-beaumont",
    name: "Camille Beaumont",
    title: "Nose · Grasse Atelier",
    focus: "Rose & iris reconstructions",
    image:
      "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=800&h=1000&fit=crop",
    excerpt:
      "Camille trained among the flower fields of Grasse, learning to chase the fleeting Centifolia harvest before dawn.",
    body: `Camille Beaumont believes a perfume should feel like a letter you almost send. Her formulas lean on rose, iris, and soft woods - never loud, always legible.

In our atelier collaborations she obsesses over the pause between heart and base: the moment a wearer forgets they applied something and simply feels more like themselves.`,
  },
  {
    slug: "amir-rahman",
    name: "Amir Rahman",
    title: "Nose · Resin & Smoke",
    focus: "Oud, frankincense, saffron",
    image:
      "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&h=1000&fit=crop",
    excerpt:
      "Amir builds nocturnal architectures from oud and incense, balancing drama with breathable air.",
    body: `Raised between Muscat and London, Amir treats oud as architecture rather than ornament. Every smoky facet needs a window - citrus peel, saffron spark, or cool vetiver.

His compositions for COSY AURA favor evening silhouettes: powerful enough for winter coats, refined enough for candlelit dinners.`,
  },
  {
    slug: "elena-voss",
    name: "Elena Voss",
    title: "Nose · Soft Modern",
    focus: "Musk, pear, clean florals",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=1000&fit=crop",
    excerpt:
      "Elena designs office-to-evening skinscents - translucent, skin-close, endlessly wearable.",
    body: `Elena’s brief is always the same: make something that disappears into personality. She layers pear, white musk, and sheer florals until the perfume feels like warm skin after rain.

Collectors who live in cities reach for her work when they want presence without performance.`,
  },
] as const;

export type CatalogFragrance = {
  id: string;
  slug: string;
  model: string;
  price: number;
  fragranceFamily: string;
  concentration: string;
  sillage: string;
  gender?: string;
  longevity?: string | null;
  topNotes?: string[];
  heartNotes?: string[];
  baseNotes?: string[];
  sustainabilityScore?: number | null;
  isVegan?: boolean;
  brand: { name: string };
  images: { url: string; alt: string | null }[];
};

export function scoreForOccasion(
  f: CatalogFragrance,
  occasionId: string
): number {
  const occ = OCCASIONS.find((o) => o.id === occasionId);
  if (!occ) return 0;
  let score = 0;
  if ((occ.families as readonly string[]).includes(f.fragranceFamily)) score += 3;
  if ((occ.sillage as readonly string[]).includes(f.sillage)) score += 2;
  return score;
}

export function scoreForSeason(f: CatalogFragrance, seasonId: string): number {
  const season = SEASONS.find((s) => s.id === seasonId);
  if (!season) return 0;
  return (season.families as readonly string[]).includes(f.fragranceFamily)
    ? 3
    : 0;
}

export function scoreForGiftPersona(
  f: CatalogFragrance,
  personaId: string
): number {
  const persona = GIFT_PERSONAS.find((p) => p.id === personaId);
  if (!persona) return 0;
  let score = 0;
  if ((persona.families as readonly string[]).includes(f.fragranceFamily))
    score += 3;
  if ((persona.concentration as readonly string[]).includes(f.concentration))
    score += 1;
  if (persona.id === "naturalist" && (f.isVegan || (f.sustainabilityScore ?? 0) >= 70))
    score += 2;
  return score;
}

export function currentSeasonId(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}
