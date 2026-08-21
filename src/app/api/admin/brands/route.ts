import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";

export async function GET() {
  const { error } = await requireAdminApi("catalog.read");
  if (error) return error;

  const brands = await prisma.brand.findMany({
    include: { _count: { select: { fragrances: true, series: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(brands);
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("catalog.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const brand = await prisma.brand.create({
    data: {
      name,
      slug: slugify(name),
      logo: body.logo || null,
    },
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "catalog.brand.create",
    entityType: "Brand",
    entityId: brand.id,
    summary: `Created brand ${brand.name}`,
    req,
  });

  return NextResponse.json(brand);
}
