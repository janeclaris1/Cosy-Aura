import { requireAdminPage } from "@/lib/admin";
import { FragranceForm } from "@/components/admin/FragranceForm";
import { getAllBrands } from "@/lib/fragrances";

export default async function NewFragrancePage() {
  await requireAdminPage();
  const brands = await getAllBrands();

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-8">Add New Fragrance</h1>
      <FragranceForm brands={brands} />
    </div>
  );
}
