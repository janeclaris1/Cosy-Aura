import { requireAdminPage } from "@/lib/admin";
import { BranchStockManager } from "@/components/admin/BranchStockManager";

export default async function AdminStockPage() {
  await requireAdminPage("stock.read");

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Branch stock</h1>
      <p className="text-sm text-mocha mb-8 max-w-2xl">
        Set 30ml / 50ml / 100ml quantities per shop, bulk-set, or record
        receive/damage/recount adjustments. Low-stock alerts fire when a size is
        at or below the threshold (default 5).
      </p>
      <BranchStockManager />
    </div>
  );
}
