import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { syncFragranceCountryStocks } from "@/lib/sync-country-stock";
import { ensureFragranceBarcodes, syncFragranceBarcodes } from "@/lib/barcodes";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("catalog.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const fragrance = await prisma.fragrance.update({
    where: { id: params.id },
    data: {
      brandId: body.brandId,
      model: body.model,
      reference: body.reference,
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
      stock: body.stock ?? 0,
      rating: body.rating ?? null,
      explainerVideoUrl: body.explainerVideoUrl?.trim() || null,
      featured: body.featured,
      category: body.category || null,
    },
  });

  if (body.countryStocks) {
    await syncFragranceCountryStocks(params.id, body.countryStocks);
  }

  if (Array.isArray(body.barcodes)) {
    try {
      await syncFragranceBarcodes(params.id, body.barcodes);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid barcodes";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  await ensureFragranceBarcodes(params.id);

  if (body.imageUrl) {
    await prisma.fragranceImage.deleteMany({ where: { fragranceId: params.id } });
    await prisma.fragranceImage.create({
      data: {
        fragranceId: params.id,
        url: body.imageUrl,
        isPrimary: true,
        sortOrder: 0,
      },
    });
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "catalog.fragrance.update",
    entityType: "Fragrance",
    entityId: fragrance.id,
    summary: `Updated fragrance ${fragrance.model} (price ${fragrance.price}, stock ${fragrance.stock})`,
    req,
    metadata: { price: fragrance.price, stock: fragrance.stock },
  });

  return NextResponse.json(fragrance);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("catalog.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.fragrance.findUnique({
    where: { id: params.id },
    select: { id: true, model: true, reference: true },
  });

  const orderItems = await prisma.orderItem.count({
    where: { fragranceId: params.id },
  });
  if (orderItems > 0) {
    return NextResponse.json(
      { error: "Cannot delete a fragrance that appears in orders" },
      { status: 400 }
    );
  }

  await prisma.fragrance.delete({ where: { id: params.id } });
  await writeAuditLog({
    actorId: ctx.userId,
    action: "catalog.fragrance.delete",
    entityType: "Fragrance",
    entityId: params.id,
    summary: `Deleted fragrance ${existing?.model || params.id}`,
    req,
  });
  return NextResponse.json({ ok: true });
}
