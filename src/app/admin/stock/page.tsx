import { requireAdminPage } from "@/lib/admin";
import { BranchStockManager } from "@/components/admin/BranchStockManager";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminStockPage() {
  await requireAdminPage("stock.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Branch stock"
        description="Set 30 / 50 / 100 ml quantities per shop. Bulk-set counts, record adjustments, and keep POS inventory in sync."
      />
      <BranchStockManager />
    </div>
  );
}
