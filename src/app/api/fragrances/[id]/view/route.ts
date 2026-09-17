import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitResponse } from "@/lib/public-rate-limit";
import { isRateLimited } from "@/lib/rate-limit";

type RouteContext = { params: { id: string } };

export async function POST(req: Request, { params }: RouteContext) {
  const id = String(params.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing fragrance id" }, { status: 400 });
  }

  const ip = clientIp(req);
  if (await isRateLimited(`public:fragrance-view:${ip}`, 80)) {
    return rateLimitResponse();
  }
  if (await isRateLimited(`public:fragrance-view:${id}:${ip}`, 12)) {
    return rateLimitResponse();
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
