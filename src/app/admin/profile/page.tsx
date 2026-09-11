import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail, staffRoleLabel } from "@/lib/rbac";
import { AdminProfileForm } from "@/components/admin/AdminProfileForm";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminProfilePage() {
  const ctx = await requireAdminPage();

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      image: true,
      staffRole: true,
      staffCountry: true,
    },
  });

  if (!user) {
    return null;
  }

  const roleLabel = user.staffRole
    ? staffRoleLabel(user.staffRole)
    : isSuperAdminEmail(user.email)
      ? "Super Admin"
      : "Admin";

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Account"
        title="My profile"
        description="Upload a photo and keep your contact details up to date."
      />
      <AdminProfileForm
        initial={{
          ...user,
          roleLabel,
        }}
      />
    </div>
  );
}
