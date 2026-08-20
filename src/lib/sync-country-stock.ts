import "server-only";

import { prisma } from "@/lib/prisma";
import {
  parseCountryStockInput,
  type ManagedStockCountry,
} from "@/lib/country-stock";

export async function syncFragranceCountryStocks(
  fragranceId: string,
  input: unknown
) {
  const rows = parseCountryStockInput(input);
  if (!rows.length) return;

  await Promise.all(
    rows.map((row) =>
      prisma.fragranceCountryStock.upsert({
        where: {
          fragranceId_country: {
            fragranceId,
            country: row.country,
          },
        },
        create: {
          fragranceId,
          country: row.country,
          inStock: row.inStock,
        },
        update: {
          inStock: row.inStock,
        },
      })
    )
  );
}

export function defaultCountryStocksFromGlobal(
  stock: number
): Array<{ country: ManagedStockCountry; inStock: boolean }> {
  const inStock = stock > 0;
  return [
    { country: "GH", inStock },
    { country: "CM", inStock },
  ];
}
