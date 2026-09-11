import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { FragranceForm } from "@/components/admin/FragranceForm";
import { getAllBrands } from "@/lib/fragrances";
import { AdminButton, AdminPageHeader, adminPageWrap } from "@/components/admin/admin-ui";

interface PageProps {
  params: { id: string };
}

export default async function EditFragrancePage({ params }: PageProps) {
  await requireAdminPage();

  const [fragrance, brands] = await Promise.all([
    prisma.fragrance.findUnique({
      where: { id: params.id },
      include: {
        brand: true,
        images: true,
        countryStocks: true,
        barcodes: true,
      },
    }),
    getAllBrands(),
  ]);

  if (!fragrance) notFound();

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Edit fragrance"
        description={`${fragrance.brand.name} · ${fragrance.model}`}
        actions={
          <>
            <AdminButton
              href={`/admin/fragrances/${fragrance.id}/labels`}
              variant="secondary"
            >
              Barcode labels
            </AdminButton>
          </>
        }
      />
      <FragranceForm brands={brands} fragrance={fragrance} />
    </div>
  );
}
