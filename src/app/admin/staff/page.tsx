import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";

/** Staff management now lives under HR & payroll. */
export default async function AdminStaffPage() {
  await requireAdminPage("staff.read");
  redirect("/admin/hr?tab=staff");
}
