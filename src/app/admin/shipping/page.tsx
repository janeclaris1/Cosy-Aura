import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ensureDefaultShippingMethods } from "@/lib/shipping-methods";
import { ShippingManager } from "@/components/admin/ShippingManager";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminShippingPage() {
  await requireAdminPage();

  await ensureDefaultShippingMethods();

  const methods = await prisma.shippingMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Store"
        title="Shipping"
        description="Manage delivery options and prices shown at checkout."
      />
      <ShippingManager initialMethods={methods} />
    </div>
  );
}
