import { ProductCatalogPage } from "@/components/products/ProductCatalogPage";
import { buildCatalogMetadata } from "@/lib/catalog-metadata";

export const revalidate = 300;
export const metadata = buildCatalogMetadata("wallets");

export default function WalletsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return <ProductCatalogPage catalog="wallets" searchParams={searchParams} />;
}
