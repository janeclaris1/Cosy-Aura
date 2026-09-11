import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BrandManager } from "@/components/admin/BrandManager";
import { AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

export default async function AdminBrandsPage() {
  await requireAdminPage();

  const brands = await prisma.brand.findMany({
    include: { _count: { select: { fragrances: true, series: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Brands"
        description="Manage the brand catalogue used across the storefront and product imports."
      />
      <BrandManager initialBrands={brands} />
    </div>
  );
}
