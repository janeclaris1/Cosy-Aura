import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { LONGEVITY_MATCHERS } from "./filter-options";
import {
  FRAGRANCE_PAGE_SIZE,
  fragranceListInclude,
  isRealisticBottleSize,
  parseFragranceListFilters,
  type FragranceListFilters,
  type FragranceWithRelations,
} from "./fragrances-shared";
import { prisma } from "./prisma";

export type { FragranceListFilters, FragranceWithRelations };
export {
  FRAGRANCE_PAGE_SIZE,
  isRealisticBottleSize,
  isRealisticYear,
  parseFragranceListFilters,
} from "./fragrances-shared";

const MIN_VALID_YEAR = 1950;
const MAX_VALID_YEAR = new Date().getFullYear() + 1;

function longevityOrClauses(tokens: string[]): Prisma.FragranceWhereInput[] {
  const clauses: Prisma.FragranceWhereInput[] = [];
  for (const token of tokens) {
    const patterns = LONGEVITY_MATCHERS[token] || [token];
    for (const p of patterns) {
      clauses.push({ longevity: { contains: p, mode: "insensitive" } });
    }
  }
  return clauses;
}

export async function getFragrances(filters: FragranceListFilters = {}) {
  try {
    const page = filters.page || 1;
    const limit = filters.limit || FRAGRANCE_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const where: Prisma.FragranceWhereInput = {};
    const and: Prisma.FragranceWhereInput[] = [];

    if (filters.brandSlug) {
      where.brand = { slug: filters.brandSlug };
    }

    if (filters.seriesSlug) {
      where.series = { slug: filters.seriesSlug };
    }

    if (filters.bottleSizes?.length) {
      where.bottleSize = { in: filters.bottleSizes };
    } else if (filters.bottleSize) {
      where.bottleSize = filters.bottleSize;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }
    if (filters.conditions?.length) where.condition = { in: filters.conditions as never };
    if (filters.fragranceFamilies?.length)
      where.fragranceFamily = { in: filters.fragranceFamilies as never };
    if (filters.bottleMaterials?.length)
      where.bottleMaterial = { in: filters.bottleMaterials as never };
    if (filters.capTypes?.length) where.capType = { in: filters.capTypes as never };
    if (filters.concentrations?.length)
      where.concentration = { in: filters.concentrations as never };
    if (filters.sillages?.length) where.sillage = { in: filters.sillages as never };

    if (filters.genders?.length) {
      where.gender = { in: filters.genders as never };
    } else if (filters.gender) {
      where.gender = filters.gender as never;
    }

    if (filters.collections?.length) {
      and.push({
        OR: filters.collections.map((c) => ({
          collection: { contains: c, mode: "insensitive" as const },
        })),
      });
    }

    if (filters.longevities?.length) {
      and.push({ OR: longevityOrClauses(filters.longevities) });
    }

    if (filters.category) where.category = filters.category;
    if (filters.sampleAvailable !== undefined)
      where.sampleAvailable = filters.sampleAvailable;
    if (filters.isCrueltyFree !== undefined) where.isCrueltyFree = filters.isCrueltyFree;
    if (filters.isVegan !== undefined) where.isVegan = filters.isVegan;

    if (filters.sustainability?.includes("sustainable")) {
      and.push({ sustainabilityScore: { gte: 4 } });
    }

    if (filters.minYear || filters.maxYear) {
      const yearFilter: { gte?: number; lte?: number } = {
        gte: MIN_VALID_YEAR,
        lte: MAX_VALID_YEAR,
      };
      if (filters.minYear) yearFilter.gte = Math.max(filters.minYear, MIN_VALID_YEAR);
      if (filters.maxYear) yearFilter.lte = Math.min(filters.maxYear, MAX_VALID_YEAR);
      where.year = yearFilter;
    }

    if (and.length) where.AND = and;

    let orderBy: Prisma.FragranceOrderByWithRelationInput = { createdAt: "desc" };
    switch (filters.sort) {
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
      case "reference":
        orderBy = { reference: "asc" };
        break;
    }

    const [fragrances, total] = await Promise.all([
      prisma.fragrance.findMany({
        where,
        include: fragranceListInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.fragrance.count({ where }),
    ]);

    return { fragrances, total, pages: Math.ceil(total / limit), page, limit };
  } catch (error) {
    console.error("[getFragrances] database error:", error);
    return {
      fragrances: [],
      total: 0,
      pages: 0,
      page: 1,
      limit: filters.limit || FRAGRANCE_PAGE_SIZE,
    };
  }
}

export async function getFeaturedFragrances(limit = 8) {
  try {
    return await prisma.fragrance.findMany({
      where: { featured: true },
      include: fragranceListInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

const COUNTED_ORDER_STATUSES = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

/** Top fragrances by total units sold (paid orders only). */
export async function getBestSellingFragrances(limit = 12) {
  const include = fragranceListInclude;

  try {
    const ranked = await prisma.orderItem.groupBy({
      by: ["fragranceId"],
      where: {
        order: { status: { in: [...COUNTED_ORDER_STATUSES] } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    const ids = ranked.map((row) => row.fragranceId);
    const fragrances = ids.length
      ? await prisma.fragrance.findMany({
          where: { id: { in: ids } },
          include,
        })
      : [];

    const byId = new Map(fragrances.map((f) => [f.id, f]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((f): f is NonNullable<typeof f> => !!f);

    if (ordered.length >= limit) return ordered.slice(0, limit);

    const excludeIds = ordered.map((f) => f.id);
    const fallback = await prisma.fragrance.findMany({
      where: {
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
        OR: [{ featured: true }, { stock: { gt: 0 } }],
      },
      include,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: limit - ordered.length,
    });

    return [...ordered, ...fallback];
  } catch (error) {
    console.error("[getBestSellingFragrances] database error:", error);
    return getFeaturedFragrances(limit);
  }
}

export async function getLatestFragrances(limit = 12) {
  try {
    return await prisma.fragrance.findMany({
      include: fragranceListInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

function shuffleFragrances<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Random fragrance sample for homepage sections. */
export async function getRandomFragrances(
  limit = 6,
  options: { excludeIds?: string[]; featuredOnly?: boolean } = {}
) {
  try {
    const poolSize = Math.max(limit * 8, 48);
    const fragrances = await prisma.fragrance.findMany({
      where: {
        ...(options.featuredOnly ? { featured: true } : {}),
        ...(options.excludeIds?.length
          ? { id: { notIn: options.excludeIds } }
          : {}),
      },
      include: fragranceListInclude,
      take: poolSize,
    });
    return shuffleFragrances(fragrances).slice(0, limit);
  } catch {
    return [];
  }
}

export const getFragranceBySlug = cache(async (slug: string) => {
  try {
    return await prisma.fragrance.findUnique({
      where: { slug },
      include: fragranceListInclude,
    });
  } catch {
    return null;
  }
});

export async function getFragrancesByBrand(
  brandSlug: string,
  filters?: Omit<FragranceListFilters, "brandSlug">
) {
  return getFragrances({ ...filters, brandSlug });
}

export async function getAllBrands() {
  try {
    return await prisma.brand.findMany({ orderBy: { name: "asc" } });
  } catch (error) {
    console.error("[getAllBrands] database error:", error);
    return [];
  }
}

export async function getFilterOptions(brandSlug?: string) {
  try {
    const brand = brandSlug
      ? await prisma.brand.findUnique({ where: { slug: brandSlug } })
      : null;

    const [brands, series, bottleSizes] = await Promise.all([
      prisma.brand.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      prisma.series.findMany({
        where: brand ? { brandId: brand.id } : undefined,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          brand: { select: { slug: true, name: true } },
        },
      }),
      prisma.fragrance.findMany({
        where: brand ? { brandId: brand.id } : undefined,
        distinct: ["bottleSize"],
        select: { bottleSize: true },
        orderBy: { bottleSize: "asc" },
      }),
    ]);

    return {
      brands,
      series,
      bottleSizes: bottleSizes
        .map((row) => row.bottleSize)
        .filter(isRealisticBottleSize)
        .sort((a, b) => a - b),
    };
  } catch {
    return { brands: [], series: [], bottleSizes: [] as number[] };
  }
}

export const getBrandBySlug = cache(async (slug: string) => {
  try {
    return await prisma.brand.findUnique({ where: { slug } });
  } catch (error) {
    console.error("[getBrandBySlug] database error:", error);
    return null;
  }
});

export async function getRelatedFragrances(
  fragranceId: string,
  brandId: string,
  limit = 18
) {
  return prisma.fragrance.findMany({
    where: { brandId, NOT: { id: fragranceId } },
    include: fragranceListInclude,
    take: limit,
  });
}

/** Suggested products for PDP carousel — complementary families, in stock. */
export async function getSuggestedFragrances(
  fragranceId: string,
  limit = 24,
  options?: { country?: string | null; currency?: string | null }
) {
  try {
    const anchor = await prisma.fragrance.findUnique({
      where: { id: fragranceId },
      select: {
        id: true,
        fragranceFamily: true,
        gender: true,
        brandId: true,
        price: true,
      },
    });
    if (!anchor) return [];

    const { getCrossSellFragrances } = await import("./cross-sell");
    return getCrossSellFragrances({
      anchors: [anchor],
      excludeIds: [fragranceId],
      context: "pdp",
      limit,
      country: options?.country,
      currency: options?.currency,
    });
  } catch {
    return [];
  }
}

/** @deprecated Use getSuggestedFragrances — kept for any stale imports */
export async function getFragrancesExcept(fragranceId: string, limit = 24) {
  return getSuggestedFragrances(fragranceId, limit);
}

export async function getAllFragranceSlugs() {
  try {
    return await prisma.fragrance.findMany({ select: { slug: true } });
  } catch {
    return [];
  }
}

export async function getDashboardStats() {
  const [totalFragrances, totalOrders, totalRevenue, recentOrders] =
    await Promise.all([
      prisma.fragrance.count(),
      prisma.order.count({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      }),
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { fragrance: { include: { brand: true } } } },
        },
      }),
    ]);

  return {
    totalFragrances,
    totalOrders,
    totalRevenue: totalRevenue._sum.total || 0,
    recentOrders,
  };
}

/** @deprecated Use getFragrances - kept briefly for gradual imports */
export const getWatches = getFragrances;
export const WATCH_PAGE_SIZE = FRAGRANCE_PAGE_SIZE;
