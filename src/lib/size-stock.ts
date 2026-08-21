import type { BottleSize } from "@/lib/bottle-sizes";

export type SizeStockMap = Record<BottleSize, number>;

export function emptySizeStock(): SizeStockMap {
  return { 30: 0, 50: 0, 100: 0 };
}
