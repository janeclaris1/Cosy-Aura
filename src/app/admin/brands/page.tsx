import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BrandManager } from "@/components/admin/BrandManager";

export default async function AdminBrandsPage() {
  await requireAdminPage();

  const brands = await prisma.brand.findMany({
    include: { _count: { select: { fragrances: true, series: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-2">Brands</h1>
      <p className="text-sm text-wf-gray mb-8">
        Manage brand catalogue used across the storefront and imports.
      </p>
      <BrandManager initialBrands={brands} />
    </div>
  );
}
