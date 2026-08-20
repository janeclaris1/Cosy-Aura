import { getLocalWatchImagePath } from "./watchfinder";

export function getWatchImagePath(brandSlug: string, sku: string): string {
  return getLocalWatchImagePath(brandSlug, sku);
}
