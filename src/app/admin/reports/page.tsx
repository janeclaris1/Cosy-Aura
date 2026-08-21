import { requireAdminPage } from "@/lib/admin";
import { BranchReports } from "@/components/admin/BranchReports";

export default async function AdminReportsPage() {
  await requireAdminPage("reports.read");

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Branch reports</h1>
      <p className="text-sm text-mocha mb-8 max-w-2xl">
        Orders, revenue, fulfilment queue, and stock by branch in your scope.
      </p>
      <BranchReports />
    </div>
  );
}
