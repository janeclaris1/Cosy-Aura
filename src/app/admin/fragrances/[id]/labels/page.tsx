import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BarcodeLabelSheet } from "@/components/admin/BarcodeLabelSheet";
import { salePriceForSize } from "@/lib/pricing";
import { isBottleSize } from "@/lib/bottle-sizes";
import { ensureFragranceBarcodes } from "@/lib/barcodes";

export default async function FragranceLabelsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdminPage("catalog.read");

  const fragrance = await prisma.fragrance.findUnique({
    where: { id: params.id },
    include: {
      brand: { select: { name: true } },
      barcodes: { orderBy: { bottleSize: "asc" } },
    },
  });

  if (!fragrance) notFound();

  await ensureFragranceBarcodes(fragrance.id);

  const refreshed = await prisma.fragrance.findUnique({
    where: { id: params.id },
    include: {
      brand: { select: { name: true } },
      barcodes: { orderBy: { bottleSize: "asc" } },
    },
  });
  if (!refreshed) notFound();

  const labels = refreshed.barcodes.map((b) => ({
    fragranceId: refreshed.id,
    brand: refreshed.brand.name,
    model: refreshed.model,
    reference: refreshed.reference,
    bottleSize: b.bottleSize,
    barcode: b.barcode,
    priceGhs: isBottleSize(b.bottleSize)
      ? salePriceForSize(b.bottleSize, refreshed.slug)
      : 0,
  }));

  return (
    <BarcodeLabelSheet
      title={`${refreshed.brand.name} ${refreshed.model}`}
      subtitle={`${labels.length} size${labels.length === 1 ? "" : "s"} · ref. ${refreshed.reference}`}
      labels={labels}
      backHref={`/admin/fragrances/${fragrance.id}/edit`}
      backLabel="Edit fragrance"
    />
  );
}
