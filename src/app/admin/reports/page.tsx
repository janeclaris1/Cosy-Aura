import { requireAdminPage } from "@/lib/admin";
import { BranchReports } from "@/components/admin/BranchReports";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminReportsPage() {
  await requireAdminPage("reports.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Insights"
        title="Branch reports"
        description="Paid POS and online transactions, fulfilment queue, and stock by branch."
      />
      <BranchReports />
    </div>
  );
}
