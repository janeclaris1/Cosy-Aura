import { requireAdminPage } from "@/lib/admin";
import { StockTransferManager } from "@/components/admin/StockTransferManager";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminTransfersPage() {
  await requireAdminPage("stock.write");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Stock transfers"
        description="Move quantity between branches in the same country. Large moves and fulfilment requests need manager approval."
      />
      <StockTransferManager />
    </div>
  );
}
