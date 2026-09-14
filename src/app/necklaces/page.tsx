import { ProductCatalogPage } from "@/components/products/ProductCatalogPage";
import { buildCatalogMetadata } from "@/lib/catalog-metadata";

export const revalidate = 300;
export const metadata = buildCatalogMetadata("necklaces");

export default function NecklacesPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return <ProductCatalogPage catalog="necklaces" searchParams={searchParams} />;
}
