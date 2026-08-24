import "server-only";

import type { FragranceFamily, Gender } from "@prisma/client";
import {
  fragranceListInclude,
  type FragranceWithRelations,
} from "./fragrances-shared";
import { isInStockForCountry } from "./country-stock";
import {
  ghanaFreeDeliveryThresholdGhs,
  qualifiesForGhanaFreeDelivery,
} from "./ghana-delivery";
import { prisma } from "./prisma";
import { salePriceForSize } from "./pricing";

export const COMPLEMENTARY_FAMILIES: Record<
  FragranceFamily,
  FragranceFamily[]
> = {
  FLORAL: ["WOODY", "CITRUS", "FRESH"],
  ORIENTAL: ["FRESH", "CITRUS", "WOODY"],
  WOODY: ["FLORAL", "CITRUS", "SPICY"],
  FRESH: ["ORIENTAL", "WOODY", "FLORAL"],
  CITRUS: ["FLORAL", "WOODY", "ORIENTAL"],
  SPICY: ["FRESH", "CITRUS", "FLORAL"],
};

export type CrossSellAnchor = {
  id: string;
  fragranceFamily?: FragranceFamily | null;
  gender?: Gender | null;
  brandId?: string | null;
  price?: number | null;
};

export type CrossSellContext = "pdp" | "cart";

export type CrossSellOptions = {
  excludeIds?: string[];
  anchors?: CrossSellAnchor[];
  context?: CrossSellContext;
  country?: string | null;
  currency?: string | null;
  /** Cart subtotal in GHS — used for Ghana free-delivery gap scoring. */
  subtotalGhs?: number;
  limit?: number;
};

export type GhanaFreeDeliveryHint = {
  threshold: number;
  gap: number;
  qualifies: boolean;
};

function scoreCandidate(
  candidate: FragranceWithRelations,
  anchors: CrossSellAnchor[],
  context: CrossSellContext,
  ghanaGap: number | null
): number {
  let score = 0;

  const anchorFamilies = new Set(
    anchors
      .map((a) => a.fragranceFamily)
      .filter(Boolean) as FragranceFamily[]
  );
  const anchorGenders = new Set(
    anchors.map((a) => a.gender).filter(Boolean) as Gender[]
  );
  const anchorBrandIds = new Set(
    anchors.map((a) => a.brandId).filter(Boolean) as string[]
  );

  for (const family of anchorFamilies) {
    const complements = COMPLEMENTARY_FAMILIES[family] || [];
    const idx = complements.indexOf(candidate.fragranceFamily);
    if (idx >= 0) score += 30 - idx * 5;
    if (candidate.fragranceFamily === family) score += 5;
  }

  if (anchorGenders.size) {
    if (candidate.gender === "UNISEX") score += 15;
    else if (anchorGenders.has(candidate.gender)) score += 20;
    else score -= 10;
  }

  if (
    context === "cart" &&
    anchorBrandIds.size &&
    !anchorBrandIds.has(candidate.brandId)
  ) {
    score += 10;
  }

  if (ghanaGap !== null && ghanaGap > 0) {
    const price = salePriceForSize(30, candidate.slug);
    if (price >= ghanaGap * 0.5 && price <= ghanaGap * 1.5) score += 25;
    else if (price >= ghanaGap && price <= ghanaGap + 200) score += 15;
    score += Math.max(0, 10 - Math.abs(price - ghanaGap) / 50);
  }

  return score;
}

function filterInStock(
  items: FragranceWithRelations[],
  country?: string | null,
  currency?: string | null
): FragranceWithRelations[] {
  return items.filter((f) =>
    isInStockForCountry(
      { stock: f.stock, countryStocks: f.countryStocks },
      country,
      currency
    )
  );
}

function ghanaGapAmount(
  country?: string | null,
  currency?: string | null,
  subtotalGhs?: number
): number | null {
  const isGhana =
    String(country || "")
      .trim()
      .toUpperCase() === "GH" ||
    String(currency || "").toUpperCase() === "GHS";
  if (!isGhana || subtotalGhs === undefined) return null;
  if (qualifiesForGhanaFreeDelivery(subtotalGhs)) return null;
  return Math.max(0, ghanaFreeDeliveryThresholdGhs() - subtotalGhs);
}

export function buildGhanaFreeDeliveryHint(
  subtotalGhs?: number
): GhanaFreeDeliveryHint | null {
  if (subtotalGhs === undefined) return null;
  const threshold = ghanaFreeDeliveryThresholdGhs();
  const qualifies = qualifiesForGhanaFreeDelivery(subtotalGhs);
  return {
    threshold,
    gap: qualifies ? 0 : Math.max(0, threshold - subtotalGhs),
    qualifies,
  };
}

/** Smart cross-sell picks by complementary scent family, gender, stock, and optional Ghana gap. */
export async function getCrossSellFragrances(
  options: CrossSellOptions = {}
): Promise<FragranceWithRelations[]> {
  const {
    excludeIds = [],
    anchors = [],
    context = "pdp",
    country,
    currency,
    subtotalGhs,
    limit = context === "cart" ? 4 : 24,
  } = options;

  const exclude = new Set([...excludeIds, ...anchors.map((a) => a.id)]);
  const ghanaGap = ghanaGapAmount(country, currency, subtotalGhs);
  const poolLimit = Math.max(limit * 4, 48);

  const complementaryFamilies = new Set<FragranceFamily>();
  for (const anchor of anchors) {
    if (!anchor.fragranceFamily) continue;
    for (const family of COMPLEMENTARY_FAMILIES[anchor.fragranceFamily]) {
      complementaryFamilies.add(family);
    }
  }

  let candidates: FragranceWithRelations[] = [];

  if (complementaryFamilies.size > 0) {
    candidates = await prisma.fragrance.findMany({
      where: {
        id: { notIn: [...exclude] },
        fragranceFamily: { in: [...complementaryFamilies] },
      },
      include: fragranceListInclude,
      take: poolLimit,
    });
  }

  if (candidates.length < poolLimit) {
    const more = await prisma.fragrance.findMany({
      where: {
        id: { notIn: [...exclude, ...candidates.map((c) => c.id)] },
      },
      include: fragranceListInclude,
      orderBy: { createdAt: "desc" },
      take: poolLimit - candidates.length,
    });
    candidates = [...candidates, ...more];
  }

  candidates = filterInStock(candidates, country, currency);

  const scored = candidates
    .map((fragrance) => ({
      fragrance,
      score: scoreCandidate(fragrance, anchors, context, ghanaGap),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.fragrance.createdAt.getTime() - a.fragrance.createdAt.getTime()
    );

  return scored.slice(0, limit).map((row) => row.fragrance);
}
