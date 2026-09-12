import { requireAdminPage } from "@/lib/admin";
import { AccountingHub } from "@/components/admin/AccountingHub";
import { AdminButton, AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminAccountingPage() {
  const ctx = await requireAdminPage("accounting.read");

  const canPayroll = hasPermission(ctx.permissions, "payroll.read");

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Finance"
        title="Accounting"
        description="Ghana general ledger — sales, COGS, and payroll post automatically when orders pay and pay runs close. Set unit cost on each fragrance for COGS. Record other expenses here and review P&L."
        actions={
          canPayroll ? (
            <AdminButton href="/admin/hr?tab=payroll" variant="secondary">
              Open payroll
            </AdminButton>
          ) : undefined
        }
      />
      <AccountingHub />
    </div>
  );
}
