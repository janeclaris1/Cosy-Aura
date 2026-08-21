import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("catalog.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const brand = await prisma.brand.update({
    where: { id: params.id },
    data: {
      name,
      slug: slugify(name),
      logo: body.logo ?? undefined,
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "catalog.brand.update",
    entityType: "Brand",
    entityId: brand.id,
    summary: `Updated brand ${brand.name}`,
    req,
  });

  return NextResponse.json(brand);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("catalog.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await prisma.fragrance.count({ where: { brandId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete brand with ${count} fragrances` },
      { status: 400 }
    );
  }

  const brand = await prisma.brand.delete({ where: { id: params.id } });
  await writeAuditLog({
    actorId: ctx.userId,
    action: "catalog.brand.delete",
    entityType: "Brand",
    entityId: params.id,
    summary: `Deleted brand ${brand.name}`,
    req,
  });
  return NextResponse.json({ ok: true });
}
