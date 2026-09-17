import { requireAdminPage } from "@/lib/admin-page";
import { BranchStockManager } from "@/components/admin/BranchStockManager";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminStockPage() {
  await requireAdminPage("stock.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Branch stock"
        description="Set branch quantities for perfumes (30 / 50 / 100 ml) and catalog items (units). Bulk-set counts, record adjustments, and keep POS inventory in sync."
      />
      <BranchStockManager />
    </div>
  );
}
