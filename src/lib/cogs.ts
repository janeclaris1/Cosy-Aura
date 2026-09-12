import { prisma } from "@/lib/prisma";

export function roundCogs(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Scale catalog cost to the line bottle size. */
export function unitCostForBottleSize(
  costPriceGhs: number,
  catalogBottleSize: number,
  lineBottleSize: number
): number {
  if (!Number.isFinite(costPriceGhs) || costPriceGhs <= 0) return 0;
  if (!catalogBottleSize || catalogBottleSize <= 0) return roundCogs(costPriceGhs);
  return roundCogs(costPriceGhs * (lineBottleSize / catalogBottleSize));
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
    select: { id: true, costPriceGhs: true, bottleSize: true },
  });
  const byId = new Map(fragrances.map((f) => [f.id, f]));

  return lines.map((line) => {
    const f = byId.get(line.fragranceId);
    const unitCostGhs = f
      ? unitCostForBottleSize(f.costPriceGhs, f.bottleSize, line.bottleSize)
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
