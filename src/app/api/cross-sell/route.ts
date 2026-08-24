import { NextResponse } from "next/server";
import {
  buildGhanaFreeDeliveryHint,
  getCrossSellFragrances,
  type CrossSellAnchor,
} from "@/lib/cross-sell";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exclude = searchParams.get("exclude")?.split(",").filter(Boolean) ?? [];
  const context = searchParams.get("context") === "cart" ? "cart" : "pdp";
  const country = searchParams.get("country");
  const currency = searchParams.get("currency");
  const subtotalRaw = searchParams.get("subtotalGhs");
  const subtotalGhs =
    subtotalRaw !== null && subtotalRaw !== ""
      ? Number(subtotalRaw)
      : undefined;
  const limitRaw = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, context === "cart" ? 6 : 24)
      : context === "cart"
        ? 4
        : 12;

  let anchors: CrossSellAnchor[] = [];
  const anchorIds =
    searchParams.get("anchorIds")?.split(",").filter(Boolean) ?? exclude;

  if (anchorIds.length) {
    anchors = await prisma.fragrance.findMany({
      where: { id: { in: anchorIds.slice(0, 12) } },
      select: {
        id: true,
        fragranceFamily: true,
        gender: true,
        brandId: true,
        price: true,
      },
    });
  }

  const fragrances = await getCrossSellFragrances({
    excludeIds: exclude,
    anchors,
    context,
    country,
    currency,
    subtotalGhs:
      subtotalGhs !== undefined && Number.isFinite(subtotalGhs)
        ? subtotalGhs
        : undefined,
    limit,
  });

  const ghanaFreeDelivery =
    country?.toUpperCase() === "GH" || currency?.toUpperCase() === "GHS"
      ? buildGhanaFreeDeliveryHint(
          subtotalGhs !== undefined && Number.isFinite(subtotalGhs)
            ? subtotalGhs
            : undefined
        )
      : null;

  return NextResponse.json({ fragrances, ghanaFreeDelivery });
}
