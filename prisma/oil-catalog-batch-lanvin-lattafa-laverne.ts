import type { OilFragrance } from "./oil-catalog";

const IMG = "/images/fragrances/new";

function oil(
  item: Omit<OilFragrance, "description" | "category" | "sillage" | "longevity"> &
    Partial<Pick<OilFragrance, "description" | "category" | "sillage" | "longevity">>
): OilFragrance {
  const category = item.category ?? item.family.charAt(0) + item.family.slice(1).toLowerCase();
  return {
    sillage: item.sillage ?? "MODERATE",
    longevity: item.longevity ?? "8-10 hours",
    category,
    description:
      item.description ??
      `Oil-based ${item.model} by ${item.brand} — an alcohol-free perfume oil with a dab-on wooden cap. Available in 30ml, 50ml, and 100ml.`,
    ...item,
  };
}

const FLORAL_W = {
  family: "FLORAL" as const,
  gender: "WOMENS" as const,
  topNotes: ["Pear", "Bergamot", "Fruity notes"],
  heartNotes: ["Rose", "Jasmine", "Peony"],
  baseNotes: ["Musk", "Vanilla", "Cedar"],
  images: [`${IMG}/oil-bare-rose.png`],
  price: 52,
};

const ORIENTAL_U = {
  family: "ORIENTAL" as const,
  gender: "UNISEX" as const,
  topNotes: ["Saffron", "Bergamot", "Spice"],
  heartNotes: ["Oud", "Rose", "Amber"],
  baseNotes: ["Musk", "Vanilla", "Woods"],
  images: [`${IMG}/oil-shay-oud.png`],
  price: 58,
};

const ORIENTAL_M = { ...ORIENTAL_U, gender: "MENS" as const, price: 56 };
const ORIENTAL_W = { ...ORIENTAL_U, gender: "WOMENS" as const, price: 58 };

/** S.No 1648–1683 — Lanvin, Lattafa, Laverne batch. */
export const lanvinLattafaLaverneBatch: OilFragrance[] = [
  oil({ brand: "Lanvin", brandSlug: "lanvin", model: "Eclat de Nuit", reference: "CA-OIL-LV-EDN-50", ...FLORAL_W }),
  oil({ brand: "Lanvin", brandSlug: "lanvin", model: "Marry Me", reference: "CA-OIL-LV-MM-50", ...FLORAL_W }),
  oil({
    brand: "Lanvin",
    brandSlug: "lanvin",
    model: "Modern Princess Eau Sensuelle",
    reference: "CA-OIL-LV-MPE-50",
    ...FLORAL_W,
  }),
  oil({ brand: "Lanvin", brandSlug: "lanvin", model: "Modern Princess", reference: "CA-OIL-LV-MP-50", ...FLORAL_W }),
  oil({ brand: "Lanvin", brandSlug: "lanvin", model: "Oxygene", reference: "CA-OIL-LV-OX-50", ...FLORAL_W }),
  oil({ brand: "Lanvin", brandSlug: "lanvin", model: "Rose Femme", reference: "CA-OIL-LV-RF-50", ...FLORAL_W }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Ajwad", reference: "CA-OIL-LF-AJW-50", ...ORIENTAL_U }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Ameerat Al Arab",
    reference: "CA-OIL-LF-AAR-50",
    ...ORIENTAL_W,
  }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Art of Nature 1",
    reference: "CA-OIL-LF-AON1-50",
    ...ORIENTAL_U,
  }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Art of Nature 2",
    reference: "CA-OIL-LF-AON2-50",
    ...ORIENTAL_U,
  }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Asad", reference: "CA-OIL-LF-ASD-50", ...ORIENTAL_M, sillage: "INTENSE" }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Bade Al Oud Sublime",
    reference: "CA-OIL-LF-BAS-50",
    ...ORIENTAL_U,
    sillage: "INTENSE",
  }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Bade'e Al Oud of Glory",
    reference: "CA-OIL-LF-BAOG-50",
    ...ORIENTAL_U,
    sillage: "POWERFUL",
  }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Eclaire", reference: "CA-OIL-LF-ECL-50", ...ORIENTAL_W }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Fakhar Extrait",
    reference: "CA-OIL-LF-FKE-50",
    ...ORIENTAL_M,
    concentration: "EXTRAIT",
    sillage: "INTENSE",
  }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Fakhar Rose", reference: "CA-OIL-LF-FKR-50", ...ORIENTAL_W }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Her Confession", reference: "CA-OIL-LF-HC-50", ...ORIENTAL_W }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Khamrah Dukhane",
    reference: "CA-OIL-LF-KHD-50",
    ...ORIENTAL_U,
    sillage: "INTENSE",
    featured: true,
  }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Khamrah",
    reference: "CA-OIL-LF-KHM-50",
    ...ORIENTAL_U,
    sillage: "INTENSE",
    featured: true,
  }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Khamrah Qahwa",
    reference: "CA-OIL-LF-KHQ-50",
    ...ORIENTAL_U,
    sillage: "INTENSE",
  }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Mausuf Brown", reference: "CA-OIL-LF-MBR-50", ...ORIENTAL_M }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Mayar Cherry Intense",
    reference: "CA-OIL-LF-MCI-50",
    ...ORIENTAL_W,
    topNotes: ["Cherry", "Almond", "Bergamot"],
  }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Musk Al Raheeq",
    reference: "CA-OIL-LF-MAR-50",
    ...ORIENTAL_U,
  }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Nasheet", reference: "CA-OIL-LF-NSH-50", ...ORIENTAL_M }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Rave Now Intense",
    reference: "CA-OIL-LF-NRI-50",
    ...ORIENTAL_U,
    sillage: "INTENSE",
  }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Rave Now Rouge",
    reference: "CA-OIL-LF-NRR-50",
    ...ORIENTAL_W,
    sillage: "INTENSE",
  }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Rave Now", reference: "CA-OIL-LF-NRV-50", ...ORIENTAL_U }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Oud for Glory",
    reference: "CA-OIL-LF-OFG-50",
    ...ORIENTAL_U,
    sillage: "POWERFUL",
    featured: true,
  }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Oud Mood", reference: "CA-OIL-LF-OMD-50", ...ORIENTAL_U }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Ramz Gold", reference: "CA-OIL-LF-RMG-50", ...ORIENTAL_U }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Teriaq", reference: "CA-OIL-LF-TRQ-50", ...ORIENTAL_U }),
  oil({ brand: "Lattafa", brandSlug: "lattafa", model: "Victoria", reference: "CA-OIL-LF-VIC-50", ...ORIENTAL_W }),
  oil({
    brand: "Lattafa",
    brandSlug: "lattafa",
    model: "Yara",
    reference: "CA-OIL-LF-YAR-50",
    ...ORIENTAL_W,
    featured: true,
  }),
  oil({
    brand: "Laverne",
    brandSlug: "laverne",
    model: "Blue Lavern Tiger",
    reference: "CA-OIL-LVR-BLT-50",
    ...ORIENTAL_M,
    images: [`${IMG}/oil-arabians-tonka.png`],
    price: 54,
  }),
  oil({
    brand: "Laverne",
    brandSlug: "laverne",
    model: "L'Adore Bakhoor Classic",
    reference: "CA-OIL-LVR-LAB-50",
    ...ORIENTAL_U,
    images: [`${IMG}/oil-arabians-tonka.png`],
    price: 54,
  }),
  oil({
    brand: "Laverne",
    brandSlug: "laverne",
    model: "Miss Laverne",
    reference: "CA-OIL-LVR-MLV-50",
    ...FLORAL_W,
    images: [`${IMG}/oil-bare-rose.png`],
    price: 52,
  }),
];

export const lanvinLattafaLaverneReferences = new Set(
  lanvinLattafaLaverneBatch.map((item) => item.reference)
);
