import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      12,
      Math.max(1, Number(searchParams.get("limit") || 5))
    );

    const include = {
      brand: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
    };

    let fragrances = await prisma.fragrance.findMany({
      where: { sampleAvailable: true, stock: { gt: 0 } },
      include,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    if (fragrances.length < limit) {
      const exclude = fragrances.map((f) => f.id);
      const filler = await prisma.fragrance.findMany({
        where: {
          stock: { gt: 0 },
          ...(exclude.length ? { id: { notIn: exclude } } : {}),
        },
        include,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: limit - fragrances.length,
      });
      fragrances = [...fragrances, ...filler];
    }

    return NextResponse.json({ fragrances });
  } catch (error) {
    console.error("[samples]", error);
    return NextResponse.json(
      { error: "Could not load samples", fragrances: [] },
      { status: 500 }
    );
  }
}
