import { ProductCatalogPage } from "@/components/products/ProductCatalogPage";
import { buildCatalogMetadata } from "@/lib/catalog-metadata";

export const revalidate = 300;
export const metadata = buildCatalogMetadata("bracelets");

export default function BraceletsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return <ProductCatalogPage catalog="bracelets" searchParams={searchParams} />;
}
