import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const fragrances = await prisma.fragrance.findMany({
      where: {
        OR: [
          { model: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { brand: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 8,
    });

    const hits = fragrances.map((w) => ({
      slug: w.slug,
      brand: w.brand.name,
      model: w.model,
      reference: w.reference,
      price: w.price,
      image: w.images[0]?.url || "",
    }));

    return NextResponse.json({ hits });
  } catch {
    return NextResponse.json({ hits: [] });
  }
}
