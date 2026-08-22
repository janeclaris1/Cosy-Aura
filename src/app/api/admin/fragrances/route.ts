import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import {
  defaultCountryStocksFromGlobal,
  syncFragranceCountryStocks,
} from "@/lib/sync-country-stock";
import { initialEngagementCounts } from "@/lib/product-engagement";

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("catalog.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 400 });
  }

  const slug = slugify(`${brand.name}-${body.model}-${body.reference}`);
  const stock = body.stock ?? 0;
  const engagement = initialEngagementCounts();

  const fragrance = await prisma.fragrance.create({
    data: {
      brandId: body.brandId,
      model: body.model,
      reference: body.reference,
      slug,
      description: body.description,
      conditionReport: body.conditionReport,
      price: body.price,
      condition: body.condition,
      year: body.year,
      fragranceFamily: body.fragranceFamily,
      bottleMaterial: body.bottleMaterial,
      bottleDetail: body.bottleDetail || null,
      bottleSize: body.bottleSize,
      capType: body.capType,
      liquidColor: body.liquidColor || null,
      longevity: body.longevity || null,
      bottleShape: body.bottleShape || null,
      concentration: body.concentration,
      topNotes: body.topNotes || [],
      heartNotes: body.heartNotes || [],
      baseNotes: body.baseNotes || [],
      sillage: body.sillage,
      sustainabilityScore: body.sustainabilityScore ?? 3,
      isVegan: body.isVegan ?? false,
      isCrueltyFree: body.isCrueltyFree ?? true,
      sampleAvailable: body.sampleAvailable ?? false,
      gender: body.gender,
      collection: body.collection || null,
      stock,
      rating: body.rating ?? null,
      viewCount: engagement.viewCount,
      likeCount: engagement.likeCount,
      explainerVideoUrl: body.explainerVideoUrl?.trim() || null,
      featured: body.featured,
      category: body.category || null,
      images: body.imageUrl
        ? { create: [{ url: body.imageUrl, isPrimary: true, sortOrder: 0 }] }
        : undefined,
    },
  });

  await syncFragranceCountryStocks(
    fragrance.id,
    body.countryStocks?.length
      ? body.countryStocks
      : defaultCountryStocksFromGlobal(stock)
  );

  await writeAuditLog({
    actorId: ctx.userId,
    action: "catalog.fragrance.create",
    entityType: "Fragrance",
    entityId: fragrance.id,
    summary: `Created fragrance ${fragrance.model} (${fragrance.reference})`,
    req,
    metadata: { price: fragrance.price, stock },
  });

  return NextResponse.json(fragrance);
}
