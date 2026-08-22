import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

export async function POST(req: Request, { params }: RouteContext) {
  const id = String(params.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing fragrance id" }, { status: 400 });
  }

  let action: "add" | "remove" = "add";
  try {
    const body = await req.json();
    if (body?.action === "remove") action = "remove";
  } catch {
    /* default add */
  }

  try {
    const updated = await prisma.fragrance.update({
      where: { id },
      data:
        action === "add"
          ? { likeCount: { increment: 1 } }
          : { likeCount: { decrement: 1 } },
      select: { viewCount: true, likeCount: true },
    });

    return NextResponse.json({
      viewCount: updated.viewCount,
      likeCount: Math.max(0, updated.likeCount),
    });
  } catch {
    return NextResponse.json({ error: "Fragrance not found" }, { status: 404 });
  }
}
