import { requireAdminPage } from "@/lib/admin";
import { StaffManager } from "@/components/admin/StaffManager";

export default async function AdminStaffPage() {
  await requireAdminPage("staff.read");

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Staff</h1>
      <p className="text-sm text-mocha mb-8">
        Invite branch and country teams. Only Super Admin can manage roles.
      </p>
      <StaffManager />
    </div>
  );
}
