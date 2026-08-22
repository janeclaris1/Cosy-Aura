import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

export async function POST(_req: Request, { params }: RouteContext) {
  const id = String(params.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing fragrance id" }, { status: 400 });
  }

  try {
    const updated = await prisma.fragrance.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true, likeCount: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Fragrance not found" }, { status: 404 });
  }
}
