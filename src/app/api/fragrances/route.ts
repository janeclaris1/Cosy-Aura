import { NextResponse } from "next/server";
import { getFragrances, parseFragranceListFilters } from "@/lib/fragrances";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean);

  if (ids?.length) {
    const fragrances = await prisma.fragrance.findMany({
      where: { id: { in: ids } },
      include: { brand: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });

    return NextResponse.json({ fragrances });
  }

  const filters = parseFragranceListFilters(searchParams);
  const result = await getFragrances(filters);

  return NextResponse.json(result);
}
