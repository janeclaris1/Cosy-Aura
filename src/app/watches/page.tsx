import { ProductCatalogPage } from "@/components/products/ProductCatalogPage";
import { WatchCatalogHero } from "@/components/products/WatchCatalogHero";
import { buildCatalogMetadata } from "@/lib/catalog-metadata";
import { getWatchCatalogHeroItems } from "@/lib/fragrances";

export const revalidate = 300;
export const metadata = buildCatalogMetadata("watches");

export default async function WatchesPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const heroWatches = await getWatchCatalogHeroItems(3);

  return (
    <>
      <WatchCatalogHero watches={heroWatches} />
      <ProductCatalogPage
        catalog="watches"
        searchParams={searchParams}
        showHeader={false}
        containerId="watch-catalog"
      />
    </>
  );
}
