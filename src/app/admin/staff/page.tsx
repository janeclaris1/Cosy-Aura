import { requireAdminPage } from "@/lib/admin";
import { StaffManager } from "@/components/admin/StaffManager";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminStaffPage() {
  await requireAdminPage("staff.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="People"
        title="Staff"
        description="Invite branch and country teams. Only Super Admin can manage roles and permissions."
      />
      <StaffManager />
    </div>
  );
}
