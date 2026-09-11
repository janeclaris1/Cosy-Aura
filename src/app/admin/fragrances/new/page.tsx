import { requireAdminPage } from "@/lib/admin";
import { FragranceForm } from "@/components/admin/FragranceForm";
import { getAllBrands } from "@/lib/fragrances";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function NewFragrancePage() {
  await requireAdminPage();
  const brands = await getAllBrands();

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Add fragrance"
        description="Create a new product for the storefront and branch inventory."
      />
      <FragranceForm brands={brands} />
    </div>
  );
}
