import "server-only";

import { prisma } from "@/lib/prisma";
import {
  stockCountryForShopper,
  type ManagedStockCountry,
} from "@/lib/country-stock";
import { BOTTLE_SIZES, type BottleSize } from "@/lib/bottle-sizes";
import { emptySizeStock, type SizeStockMap } from "@/lib/size-stock";

/** Sum of branch stock for each bottle size in a managed country. */
export async function getSizeStockForFragrance(
  fragranceId: string,
  shopperCountry: string | null | undefined
): Promise<SizeStockMap> {
  const bucket = stockCountryForShopper(shopperCountry);
  if (!bucket) return emptySizeStock();

  const branches = await prisma.branch.findMany({
    where: { country: bucket, active: true },
    select: { id: true },
  });
  if (!branches.length) return emptySizeStock();

  const stocks = await prisma.branchStock.groupBy({
    by: ["bottleSize"],
    where: {
      fragranceId,
      branchId: { in: branches.map((b) => b.id) },
      bottleSize: { in: [...BOTTLE_SIZES] },
    },
    _sum: { quantity: true },
  });

  const out = emptySizeStock();
  for (const row of stocks) {
    const size = row.bottleSize as BottleSize;
    if (size === 30 || size === 50 || size === 100) {
      out[size] = Number(row._sum.quantity || 0);
    }
  }
  return out;
}

/**
 * Ensure cart lines have enough country pool stock for their bottle sizes.
 * Throws Error with a shopper-safe message when short.
 */
export async function assertCartSizeStockAvailable(
  items: Array<{
    fragranceId: string;
    bottleSize?: number;
    quantity: number;
    model?: string;
  }>,
  shopperCountry: string | null | undefined
): Promise<void> {
  const bucket = stockCountryForShopper(shopperCountry);
  if (!bucket) return; // non-managed markets: keep legacy global behaviour

  const needed = new Map<
    string,
    { fragranceId: string; size: BottleSize; qty: number }
  >();
  for (const item of items) {
    const size = Number(item.bottleSize);
    if (size !== 30 && size !== 50 && size !== 100) continue;
    const key = `${item.fragranceId}:${size}`;
    const prev = needed.get(key);
    needed.set(key, {
      fragranceId: item.fragranceId,
      size,
      qty: (prev?.qty || 0) + Math.max(1, Number(item.quantity) || 1),
    });
  }

  for (const row of needed.values()) {
    const stock = await getSizeStockForFragrance(row.fragranceId, bucket);
    if (stock[row.size] < row.qty) {
      throw new Error(
        `Sorry — ${row.size}ml is not available in the quantity you requested. Please choose another size or reduce quantity.`
      );
    }
  }
}

export async function getSizeStockMapForCountry(
  fragranceId: string,
  country: ManagedStockCountry
): Promise<SizeStockMap> {
  return getSizeStockForFragrance(fragranceId, country);
}
