import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BarcodeLabelSheet } from "@/components/admin/BarcodeLabelSheet";
import { salePriceForSize } from "@/lib/pricing";
import { isBottleSize } from "@/lib/bottle-sizes";

export default async function AllBarcodeLabelsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireAdminPage("catalog.read");

  const q = searchParams.q?.trim();

  const fragrances = await prisma.fragrance.findMany({
    where: q
      ? {
          OR: [
            { model: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
            { brand: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      brand: { select: { name: true } },
      barcodes: { orderBy: { bottleSize: "asc" } },
    },
    orderBy: [{ brand: { name: "asc" } }, { model: "asc" }],
    take: q ? 50 : 200,
  });

  const labels = fragrances.flatMap((f) =>
    f.barcodes.map((b) => ({
      fragranceId: f.id,
      brand: f.brand.name,
      model: f.model,
      reference: f.reference,
      bottleSize: b.bottleSize,
      barcode: b.barcode,
      priceGhs: isBottleSize(b.bottleSize)
        ? salePriceForSize(b.bottleSize, f.slug)
        : 0,
    }))
  );

  return (
    <BarcodeLabelSheet
      title={q ? "Filtered labels" : "Barcode labels"}
      subtitle={
        q
          ? `${labels.length} label${labels.length === 1 ? "" : "s"} matching “${q}”`
          : undefined
      }
      labels={labels}
      backHref="/admin/fragrances"
      showGenerate
      search={{
        action: "/admin/labels",
        defaultValue: q,
        clearHref: "/admin/labels",
      }}
    />
  );
}
