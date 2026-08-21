import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, scopedBranchIds } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { syncCountryPoolFromBranches } from "@/lib/branches";
import { isBottleSize } from "@/lib/bottle-sizes";
import type { ManagedStockCountry } from "@/lib/country-stock";
import { checkLowStockForRows } from "@/lib/low-stock";

type Params = { params: Promise<{ id: string }> };

const ADJUST_TYPES = ["receive", "damage", "recount"] as const;
type AdjustType = (typeof ADJUST_TYPES)[number];

async function canAccessBranch(
  branchId: string,
  ctx: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["ctx"]>
) {
  const scope = scopedBranchIds(ctx);
  if (scope === "all") {
    if (ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      return branch?.country === ctx.staffCountry;
    }
    return true;
  }
  return scope.includes(branchId);
}

/**
 * Adjust branch stock with a typed reason:
 * - receive: add units
 * - damage: remove units
 * - recount: set absolute quantity
 */
export async function POST(req: Request, { params }: Params) {
  const { ctx, error } = await requireAdminApi("stock.write");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: branchId } = await params;
  if (!(await canAccessBranch(branchId, ctx))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const body = await req.json();
  const fragranceId = String(body.fragranceId || "");
  const bottleSize = Number(body.bottleSize);
  const type = String(body.type || "").toLowerCase() as AdjustType;
  const reason = body.reason ? String(body.reason).trim().slice(0, 300) : "";
  const amount = Math.floor(Number(body.amount) || 0);

  if (!fragranceId || !isBottleSize(bottleSize) || !ADJUST_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid adjustment payload" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }
  if (type === "recount") {
    if (amount < 0) {
      return NextResponse.json({ error: "Recount quantity cannot be negative" }, { status: 400 });
    }
  } else if (amount < 1) {
    return NextResponse.json({ error: "Amount must be at least 1" }, { status: 400 });
  }

  const fragrance = await prisma.fragrance.findUnique({
    where: { id: fragranceId },
    select: { id: true, model: true, brand: { select: { name: true } } },
  });
  if (!fragrance) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const existing = await prisma.branchStock.findUnique({
    where: {
      branchId_fragranceId_bottleSize: { branchId, fragranceId, bottleSize },
    },
  });
  const before = Number(existing?.quantity || 0);
  let after = before;
  if (type === "receive") after = before + amount;
  else if (type === "damage") after = Math.max(0, before - amount);
  else after = amount;

  if (existing) {
    await prisma.branchStock.update({
      where: { id: existing.id },
      data: { quantity: after },
    });
  } else {
    await prisma.branchStock.create({
      data: { branchId, fragranceId, bottleSize, quantity: after },
    });
  }

  await syncCountryPoolFromBranches(
    fragranceId,
    branch.country as ManagedStockCountry
  );

  const label = `${fragrance.brand.name} ${fragrance.model}`;
  const delta = after - before;
  await writeAuditLog({
    actorId: ctx.userId,
    action: `stock.${type}`,
    entityType: "BranchStock",
    entityId: branchId,
    summary: `${type}: ${label} ${bottleSize}ml at ${branch.name} ${before} → ${after} (${reason})`,
    metadata: {
      branchId,
      fragranceId,
      bottleSize,
      type,
      before,
      after,
      delta,
      reason,
    },
  });

  await checkLowStockForRows([
    {
      branchId,
      branchName: branch.name,
      fragranceId,
      bottleSize,
      quantity: after,
    },
  ]);

  return NextResponse.json({
    ok: true,
    before,
    after,
    delta,
  });
}
