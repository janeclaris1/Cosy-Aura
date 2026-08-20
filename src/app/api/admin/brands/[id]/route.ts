import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { slugify } from "@/lib/utils";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

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

  return NextResponse.json(brand);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const count = await prisma.fragrance.count({ where: { brandId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete brand with ${count} fragrances` },
      { status: 400 }
    );
  }

  await prisma.brand.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
