import { requireAdminPage } from "@/lib/admin";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminActivityPage() {
  await requireAdminPage("audit.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Insights"
        title="Activity log"
        description="Audit trail for stock edits, transfers, POS sales, and order status changes."
      />
      <AuditLogViewer />
    </div>
  );
}
