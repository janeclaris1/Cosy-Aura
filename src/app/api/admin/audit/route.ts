import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin";

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("audit.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
  const action = String(searchParams.get("action") || "").trim();
  const entityType = String(searchParams.get("entityType") || "").trim();

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (!ctx.isSuperAdmin && !ctx.isGlobal && ctx.staffRole === "FULFILMENT") {
    where.actorId = ctx.userId;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      actor: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({ logs });
}
