import { requireAdminPage } from "@/lib/admin";
import { MyHrPanel } from "@/components/admin/MyHrPanel";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminMyHrPage() {
  await requireAdminPage("hr.self.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Overview"
        title="My HR"
        description="Your payslips, upcoming payroll, and leave balance. Management tools are in HR & payroll if your role includes them."
      />
      <MyHrPanel />
    </div>
  );
}
