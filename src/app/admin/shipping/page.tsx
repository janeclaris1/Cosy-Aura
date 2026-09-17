import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ensureDefaultShippingMethods } from "@/lib/shipping-methods";
import { ShippingManager } from "@/components/admin/ShippingManager";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminShippingPage() {
  await requireAdminPage("shipping.write");

  await ensureDefaultShippingMethods();

  const methods = await prisma.shippingMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Store"
        title="Shipping"
        description="Ghana uses local couriers at checkout. All other countries quote live Aramex rates — flat methods here are legacy only."
      />
      <ShippingManager initialMethods={methods} />
    </div>
  );
}
