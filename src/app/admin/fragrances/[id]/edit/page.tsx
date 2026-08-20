import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { FragranceForm } from "@/components/admin/FragranceForm";
import { getAllBrands } from "@/lib/fragrances";

interface PageProps {
  params: { id: string };
}

export default async function EditFragrancePage({ params }: PageProps) {
  await requireAdminPage();

  const [fragrance, brands] = await Promise.all([
    prisma.fragrance.findUnique({
      where: { id: params.id },
      include: { images: true, countryStocks: true },
    }),
    getAllBrands(),
  ]);

  if (!fragrance) notFound();

  return (
    <div>
      <h1 className="font-playfair text-3xl mb-8">Edit Fragrance</h1>
      <FragranceForm brands={brands} fragrance={fragrance} />
    </div>
  );
}
