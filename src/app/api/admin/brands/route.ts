import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";
import { slugify } from "@/lib/utils";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const brands = await prisma.brand.findMany({
    include: { _count: { select: { fragrances: true, series: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(brands);
}

export async function POST(req: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

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

  return NextResponse.json(brand);
}
