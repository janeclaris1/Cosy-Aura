import { requireAdminPage } from "@/lib/admin";
import { BranchReports } from "@/components/admin/BranchReports";
import { TaxReport } from "@/components/admin/TaxReport";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminReportsPage() {
  await requireAdminPage("reports.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Insights"
        title="Reports"
        description="Branch performance, tax totals from sales, and CSV exports for your scope."
      />
      <BranchReports />
      <TaxReport />
    </div>
  );
}
