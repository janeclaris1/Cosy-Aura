import { requireAdminPage } from "@/lib/admin-page";
import { getAllBrands } from "@/lib/fragrances";
import { FragranceForm } from "@/components/admin/FragranceForm";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";
import { getCatalog, type CatalogSlug } from "@/lib/product-catalog";

type AdminCatalogNewProductPageProps = {
  catalog: CatalogSlug;
};

export async function AdminCatalogNewProductPage({ catalog }: AdminCatalogNewProductPageProps) {
  await requireAdminPage();
  const config = getCatalog(catalog);
  const brands = await getAllBrands();

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Catalogue"
        title={config.adminAddLabel}
        description={`Create a new product in ${config.adminLabel.toLowerCase()} for the storefront and branch inventory.`}
      />
      <FragranceForm
        brands={brands}
        defaultProductType={config.productType}
        returnPath={`/admin/${catalog}`}
      />
    </div>
  );
}
