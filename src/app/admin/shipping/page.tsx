import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { seedDefaultShippingMethods } from "@/lib/shipping-methods";
import { ShippingManager } from "@/components/admin/ShippingManager";

export default async function AdminShippingPage() {
  await requireAdminPage();

  const count = await prisma.shippingMethod.count();
  if (count === 0) {
    await seedDefaultShippingMethods();
  }

  const methods = await prisma.shippingMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Shipping</h1>
      <p className="text-sm text-wf-gray mb-8">
        Manage delivery options and prices shown at Stripe checkout.
      </p>
      <ShippingManager initialMethods={methods} />
    </div>
  );
}
