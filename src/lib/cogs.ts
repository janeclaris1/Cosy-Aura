import type { ProductType } from "@prisma/client";
import {
  defaultCatalogCostPriceGhs,
  FLAT_PRODUCT_COST_GHS,
  perfumeCostGhs,
} from "@/lib/catalog-cost";
import { isPerfumeProduct } from "@/lib/product-catalog";
import { prisma } from "@/lib/prisma";
import { roundGhs } from "@/lib/round-money";

export function roundCogs(value: number): number {
  return roundGhs(value);
}

/** Resolve unit cost for a line item from product type and bottle size. */
export function unitCostForBottleSize(
  productType: ProductType | null | undefined,
  costPriceGhs: number,
  catalogBottleSize: number,
  lineBottleSize: number
): number {
  if (isPerfumeProduct(productType)) {
    const byLine = perfumeCostGhs(lineBottleSize);
    if (byLine > 0) return byLine;
  }

  if (productType && FLAT_PRODUCT_COST_GHS[productType] != null) {
    return FLAT_PRODUCT_COST_GHS[productType]!;
  }

  if (costPriceGhs > 0) return roundCogs(costPriceGhs);

  return defaultCatalogCostPriceGhs(productType, catalogBottleSize);
}

export type OrderLineInput = {
  fragranceId: string;
  price: number;
  quantity: number;
  bottleSize: number;
};

export type OrderLineCreate = OrderLineInput & {
  unitCostGhs: number | null;
};

/** Attach unitCostGhs snapshots for new order lines. */
export async function orderLinesWithUnitCost(
  lines: OrderLineInput[]
): Promise<OrderLineCreate[]> {
  if (!lines.length) return [];

  const ids = [...new Set(lines.map((l) => l.fragranceId))];
  const fragrances = await prisma.fragrance.findMany({
    where: { id: { in: ids } },
    select: { id: true, costPriceGhs: true, bottleSize: true, productType: true },
  });
  const byId = new Map(fragrances.map((f) => [f.id, f]));

  return lines.map((line) => {
    const f = byId.get(line.fragranceId);
    const unitCostGhs = f
      ? unitCostForBottleSize(
          f.productType,
          f.costPriceGhs,
          f.bottleSize,
          line.bottleSize
        )
      : 0;
    return {
      ...line,
      unitCostGhs: unitCostGhs > 0 ? unitCostGhs : null,
    };
  });
}

export function lineCogsTotal(
  quantity: number,
  unitCostGhs: number | null | undefined
): number {
  if (!unitCostGhs || unitCostGhs <= 0) return 0;
  return roundCogs(unitCostGhs * quantity);
}
