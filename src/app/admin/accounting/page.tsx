import { requireAdminPage } from "@/lib/admin-page";
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
        description="Ghana general ledger — sales, COGS, and payroll post automatically. Review P&L, balance sheet, cash flow, ratios, and track debts from the tabs below."
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
