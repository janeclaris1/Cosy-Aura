import { requireAdminPage } from "@/lib/admin";
import { BranchesManager } from "@/components/admin/BranchesManager";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminBranchesPage() {
  await requireAdminPage("branches.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Operations"
        title="Branches"
        description="Physical shops that fulfil online orders. The default branch per country drives WhatsApp, COD, couriers, pickup, and hours."
      />
      <BranchesManager />
    </div>
  );
}
