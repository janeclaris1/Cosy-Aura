import { requireAdminPage } from "@/lib/admin";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";

export default async function AdminActivityPage() {
  await requireAdminPage("audit.read");

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Activity</h1>
      <p className="text-sm text-mocha mb-8 max-w-2xl">
        Audit trail for stock edits, transfers, and order status changes.
      </p>
      <AuditLogViewer />
    </div>
  );
}
