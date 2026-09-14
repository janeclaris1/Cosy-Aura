import { ProductCatalogPage } from "@/components/products/ProductCatalogPage";
import { buildCatalogMetadata } from "@/lib/catalog-metadata";

export const revalidate = 300;
export const metadata = buildCatalogMetadata("rings");

export default function RingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return <ProductCatalogPage catalog="rings" searchParams={searchParams} />;
}
