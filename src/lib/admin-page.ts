import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { getAdminContext, type AdminContext } from "./admin";
import { hasAnyPermission, hasPermission, type Permission } from "./rbac";

export async function requireAdminPage(
  permission?: Permission | Permission[]
): Promise<AdminContext> {
  const session = await getServerSession(authOptions);
  const ctx = await getAdminContext();
  if (!ctx) {
    // Valid session but inactive/demoted — don't send them through login again.
    if (session?.user?.id) redirect("/admin?access=denied");
    redirect("/admin/login");
  }
  if (permission && !hasPermission(ctx.permissions, permission)) {
    redirect("/admin?access=denied");
  }
  return ctx;
}

/** Page gate: user needs at least one of the listed permissions. */
export async function requireAdminPageAny(
  permissions: Permission[]
): Promise<AdminContext> {
  const session = await getServerSession(authOptions);
  const ctx = await getAdminContext();
  if (!ctx) {
    if (session?.user?.id) redirect("/admin?access=denied");
    redirect("/admin/login");
  }
  if (!hasAnyPermission(ctx.permissions, permissions)) {
    redirect("/admin?access=denied");
  }
  return ctx;
}
