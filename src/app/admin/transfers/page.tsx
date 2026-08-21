import { requireAdminPage } from "@/lib/admin";
import { StockTransferManager } from "@/components/admin/StockTransferManager";

export default async function AdminTransfersPage() {
  await requireAdminPage("stock.write");

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Stock transfers</h1>
      <p className="text-sm text-mocha mb-8 max-w-2xl">
        Move quantity between branches in the same country. Large moves (and all
        fulfilment requests) need manager approval before stock changes.
      </p>
      <StockTransferManager />
    </div>
  );
}
