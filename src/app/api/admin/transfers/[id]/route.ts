import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, scopedBranchIds } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { syncCountryPoolFromBranches } from "@/lib/branches";
import type { ManagedStockCountry } from "@/lib/country-stock";
import { checkLowStockForRows } from "@/lib/low-stock";
import { createAdminNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

function canApprove(
  ctx: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["ctx"]>
) {
  return (
    ctx.isSuperAdmin ||
    ctx.staffRole === "COUNTRY_MANAGER" ||
    ctx.staffRole === "BRANCH_MANAGER"
  );
}

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

export async function POST(req: Request, { params }: Params) {
  const { ctx, error } = await requireAdminApi("stock.write");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canApprove(ctx)) {
    return NextResponse.json(
      { error: "Only managers can approve or reject transfers." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const decision = String(body.decision || "").toLowerCase();
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json(
      { error: "decision must be approve or reject" },
      { status: 400 }
    );
  }

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      fromBranch: true,
      toBranch: true,
      fragrance: { include: { brand: true } },
    },
  });
  if (!transfer) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }
  if (transfer.status !== "PENDING") {
    return NextResponse.json({ error: "Transfer is not pending" }, { status: 400 });
  }
  if (
    !(await canAccessBranch(transfer.fromBranchId, ctx)) ||
    !(await canAccessBranch(transfer.toBranchId, ctx))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (decision === "reject") {
    const updated = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedById: ctx.userId,
        approvedAt: new Date(),
      },
    });
    await writeAuditLog({
      actorId: ctx.userId,
      action: "stock.transfer.reject",
      entityType: "StockTransfer",
      entityId: id,
      summary: `Rejected transfer ${transfer.quantity}× ${transfer.bottleSize}ml ${transfer.fragrance.brand.name} ${transfer.fragrance.model}`,
    });
    await createAdminNotification({
      type: "TRANSFER_REJECTED",
      title: "Transfer rejected",
      message: `${transfer.quantity}× ${transfer.bottleSize}ml ${transfer.fragrance.brand.name} ${transfer.fragrance.model}`,
      link: "/admin/transfers",
    });
    return NextResponse.json({ transfer: updated });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const source = await tx.branchStock.findUnique({
        where: {
          branchId_fragranceId_bottleSize: {
            branchId: transfer.fromBranchId,
            fragranceId: transfer.fragranceId,
            bottleSize: transfer.bottleSize,
          },
        },
      });
      const available = Number(source?.quantity || 0);
      if (available < transfer.quantity) {
        throw new Error(`Only ${available} units available at source branch`);
      }
      await tx.branchStock.update({
        where: { id: source!.id },
        data: { quantity: available - transfer.quantity },
      });
      await tx.branchStock.upsert({
        where: {
          branchId_fragranceId_bottleSize: {
            branchId: transfer.toBranchId,
            fragranceId: transfer.fragranceId,
            bottleSize: transfer.bottleSize,
          },
        },
        create: {
          branchId: transfer.toBranchId,
          fragranceId: transfer.fragranceId,
          bottleSize: transfer.bottleSize,
          quantity: transfer.quantity,
        },
        update: { quantity: { increment: transfer.quantity } },
      });
      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: "COMPLETED",
          approvedById: ctx.userId,
          approvedAt: new Date(),
        },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Approve failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await syncCountryPoolFromBranches(
    transfer.fragranceId,
    transfer.fromBranch.country as ManagedStockCountry
  );

  const [sourceAfter, destAfter] = await Promise.all([
    prisma.branchStock.findUnique({
      where: {
        branchId_fragranceId_bottleSize: {
          branchId: transfer.fromBranchId,
          fragranceId: transfer.fragranceId,
          bottleSize: transfer.bottleSize,
        },
      },
      select: { quantity: true },
    }),
    prisma.branchStock.findUnique({
      where: {
        branchId_fragranceId_bottleSize: {
          branchId: transfer.toBranchId,
          fragranceId: transfer.fragranceId,
          bottleSize: transfer.bottleSize,
        },
      },
      select: { quantity: true },
    }),
  ]);

  await checkLowStockForRows([
    {
      branchId: transfer.fromBranchId,
      branchName: transfer.fromBranch.name,
      fragranceId: transfer.fragranceId,
      bottleSize: transfer.bottleSize,
      quantity: Number(sourceAfter?.quantity || 0),
    },
    {
      branchId: transfer.toBranchId,
      branchName: transfer.toBranch.name,
      fragranceId: transfer.fragranceId,
      bottleSize: transfer.bottleSize,
      quantity: Number(destAfter?.quantity || 0),
    },
  ]);

  await writeAuditLog({
    actorId: ctx.userId,
    action: "stock.transfer.approve",
    entityType: "StockTransfer",
    entityId: id,
    summary: `Approved transfer ${transfer.quantity}× ${transfer.bottleSize}ml ${transfer.fragrance.brand.name} ${transfer.fragrance.model}`,
  });

  await createAdminNotification({
    type: "TRANSFER_APPROVED",
    title: "Transfer approved",
    message: `${transfer.quantity}× ${transfer.bottleSize}ml moved ${transfer.fromBranch.name} → ${transfer.toBranch.name}`,
    link: "/admin/transfers",
  });

  const updated = await prisma.stockTransfer.findUnique({ where: { id } });
  return NextResponse.json({ transfer: updated });
}
