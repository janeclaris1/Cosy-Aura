import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { HrHub } from "@/components/admin/HrHub";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";
import { hasPermission } from "@/lib/rbac";

export default async function AdminHrPage() {
  const ctx = await requireAdminPage();

  const access = {
    staff: hasPermission(ctx.permissions, "staff.read"),
    hr: hasPermission(ctx.permissions, "hr.read"),
    payroll: hasPermission(ctx.permissions, "payroll.read"),
    preferredTab:
      ctx.staffRole === "ACCOUNTANT"
        ? ("payroll" as const)
        : ctx.staffRole === "HR"
          ? ("staff" as const)
          : undefined,
  };

  if (!access.staff && !access.hr && !access.payroll) {
    redirect("/admin");
  }

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="People"
        title="HR & payroll"
        description="Staff access, employee records, leave, and monthly payroll with Ghana PAYE and SSNIT."
      />
      <HrHub access={access} />
    </div>
  );
}
