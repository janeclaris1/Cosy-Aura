import { ProductCatalogPage } from "@/components/products/ProductCatalogPage";
import { buildCatalogMetadata } from "@/lib/catalog-metadata";

export const revalidate = 300;
export const metadata = buildCatalogMetadata("belts");

export default function BeltsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return <ProductCatalogPage catalog="belts" searchParams={searchParams} />;
}
