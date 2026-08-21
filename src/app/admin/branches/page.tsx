import { requireAdminPage } from "@/lib/admin";
import { BranchesManager } from "@/components/admin/BranchesManager";

export default async function AdminBranchesPage() {
  await requireAdminPage("branches.read");

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Branches</h1>
      <p className="text-sm text-mocha mb-8 max-w-2xl">
        Physical shops that fulfil online orders. The default branch per country
        also drives WhatsApp override, COD, courier options, pickup, and hours.
      </p>
      <BranchesManager />
    </div>
  );
}
