import { ProductCatalogPage } from "@/components/products/ProductCatalogPage";
import { buildCatalogMetadata } from "@/lib/catalog-metadata";

export const revalidate = 300;
export const metadata = buildCatalogMetadata("fragrances");

interface PageProps {
  searchParams: Record<string, string | undefined>;
}

export default function FragrancesPage({ searchParams }: PageProps) {
  return (
    <ProductCatalogPage
      catalog="fragrances"
      searchParams={searchParams}
      showHeader={false}
    />
  );
}
