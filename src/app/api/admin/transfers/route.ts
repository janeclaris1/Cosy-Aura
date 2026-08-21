import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, scopedBranchIds } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { syncCountryPoolFromBranches } from "@/lib/branches";
import { isBottleSize } from "@/lib/bottle-sizes";
import type { ManagedStockCountry } from "@/lib/country-stock";
import { checkLowStockForRows } from "@/lib/low-stock";
import { transferApprovalThreshold } from "@/lib/admin-context";
import { createAdminNotification } from "@/lib/notifications";

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

async function applyStockMove(input: {
  fromBranchId: string;
  toBranchId: string;
  fragranceId: string;
  bottleSize: number;
  quantity: number;
}) {
  const source = await prisma.branchStock.findUnique({
    where: {
      branchId_fragranceId_bottleSize: {
        branchId: input.fromBranchId,
        fragranceId: input.fragranceId,
        bottleSize: input.bottleSize,
      },
    },
  });
  const available = Number(source?.quantity || 0);
  if (available < input.quantity) {
    throw new Error(`Only ${available} units available at source branch`);
  }

  await prisma.branchStock.update({
    where: { id: source!.id },
    data: { quantity: available - input.quantity },
  });

  await prisma.branchStock.upsert({
    where: {
      branchId_fragranceId_bottleSize: {
        branchId: input.toBranchId,
        fragranceId: input.fragranceId,
        bottleSize: input.bottleSize,
      },
    },
    create: {
      branchId: input.toBranchId,
      fragranceId: input.fragranceId,
      bottleSize: input.bottleSize,
      quantity: input.quantity,
    },
    update: { quantity: { increment: input.quantity } },
  });
}

export async function GET(req: Request) {
  const { ctx, error } = await requireAdminApi("stock.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 40));
  const status = String(searchParams.get("status") || "").trim().toUpperCase();

  const scope = scopedBranchIds(ctx);
  const branchFilter =
    scope === "all"
      ? ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry
        ? {
            OR: [
              { fromBranch: { country: ctx.staffCountry } },
              { toBranch: { country: ctx.staffCountry } },
            ],
          }
        : {}
      : {
          OR: [
            { fromBranchId: { in: scope } },
            { toBranchId: { in: scope } },
          ],
        };

  const transfers = await prisma.stockTransfer.findMany({
    where: {
      ...branchFilter,
      ...(status ? { status: status as "PENDING" | "COMPLETED" | "REJECTED" | "CANCELLED" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      fromBranch: { select: { id: true, name: true, country: true } },
      toBranch: { select: { id: true, name: true, country: true } },
      fragrance: {
        select: {
          id: true,
          model: true,
          reference: true,
          brand: { select: { name: true } },
        },
      },
      createdBy: { select: { email: true, name: true } },
      approvedBy: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({
    transfers,
    approvalThreshold: transferApprovalThreshold(),
  });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("stock.write");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const fromBranchId = String(body.fromBranchId || "");
  const toBranchId = String(body.toBranchId || "");
  const fragranceId = String(body.fragranceId || "");
  const bottleSize = Number(body.bottleSize);
  const quantity = Math.max(0, Math.floor(Number(body.quantity) || 0));
  const reason = body.reason ? String(body.reason).trim().slice(0, 300) : null;
  const forceApproval = Boolean(body.requireApproval);

  if (!fromBranchId || !toBranchId || !fragranceId || !isBottleSize(bottleSize)) {
    return NextResponse.json({ error: "Invalid transfer payload" }, { status: 400 });
  }
  if (fromBranchId === toBranchId) {
    return NextResponse.json({ error: "Choose two different branches" }, { status: 400 });
  }
  if (quantity < 1) {
    return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
  }
  if (!(await canAccessBranch(fromBranchId, ctx)) || !(await canAccessBranch(toBranchId, ctx))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [fromBranch, toBranch, fragrance] = await Promise.all([
    prisma.branch.findUnique({ where: { id: fromBranchId } }),
    prisma.branch.findUnique({ where: { id: toBranchId } }),
    prisma.fragrance.findUnique({
      where: { id: fragranceId },
      select: { id: true, model: true, brand: { select: { name: true } } },
    }),
  ]);

  if (!fromBranch || !toBranch || !fragrance) {
    return NextResponse.json({ error: "Branch or product not found" }, { status: 404 });
  }
  if (fromBranch.country !== toBranch.country) {
    return NextResponse.json(
      { error: "Transfers must stay within the same country" },
      { status: 400 }
    );
  }
  if (!fromBranch.active || !toBranch.active) {
    return NextResponse.json({ error: "Both branches must be active" }, { status: 400 });
  }

  const threshold = transferApprovalThreshold();
  const needsApproval =
    forceApproval ||
    quantity >= threshold ||
    (!ctx.isSuperAdmin && ctx.staffRole === "FULFILMENT");

  if (needsApproval && !reason) {
    return NextResponse.json(
      { error: "Reason is required when a transfer needs approval" },
      { status: 400 }
    );
  }

  try {
    if (needsApproval) {
      // Soft-check availability now (stock reserved only on approve)
      const source = await prisma.branchStock.findUnique({
        where: {
          branchId_fragranceId_bottleSize: {
            branchId: fromBranchId,
            fragranceId,
            bottleSize,
          },
        },
      });
      if (Number(source?.quantity || 0) < quantity) {
        return NextResponse.json(
          { error: `Only ${Number(source?.quantity || 0)} units available at source` },
          { status: 400 }
        );
      }

      const transfer = await prisma.stockTransfer.create({
        data: {
          fromBranchId,
          toBranchId,
          fragranceId,
          bottleSize,
          quantity,
          reason,
          status: "PENDING",
          createdById: ctx.userId,
        },
        include: {
          fromBranch: { select: { name: true, country: true } },
          toBranch: { select: { name: true, country: true } },
        },
      });

      await writeAuditLog({
        actorId: ctx.userId,
        action: "stock.transfer.request",
        entityType: "StockTransfer",
        entityId: transfer.id,
        summary: `Requested transfer ${quantity}× ${bottleSize}ml ${fragrance.brand.name} ${fragrance.model} ${transfer.fromBranch.name} → ${transfer.toBranch.name}`,
        metadata: { quantity, bottleSize, fromBranchId, toBranchId, reason },
      });

      await createAdminNotification({
        type: "TRANSFER_PENDING",
        title: "Transfer needs approval",
        message: `${quantity}× ${bottleSize}ml ${fragrance.brand.name} ${fragrance.model}: ${transfer.fromBranch.name} → ${transfer.toBranch.name}`,
        link: "/admin/transfers?status=PENDING",
      });

      return NextResponse.json(
        { transfer, pending: true, approvalThreshold: threshold },
        { status: 201 }
      );
    }

    await applyStockMove({
      fromBranchId,
      toBranchId,
      fragranceId,
      bottleSize,
      quantity,
    });

    const transfer = await prisma.stockTransfer.create({
      data: {
        fromBranchId,
        toBranchId,
        fragranceId,
        bottleSize,
        quantity,
        reason,
        status: "COMPLETED",
        createdById: ctx.userId,
        approvedById: ctx.userId,
        approvedAt: new Date(),
      },
      include: {
        fromBranch: { select: { name: true, country: true } },
        toBranch: { select: { name: true, country: true } },
      },
    });

    await syncCountryPoolFromBranches(
      fragranceId,
      fromBranch.country as ManagedStockCountry
    );

    await writeAuditLog({
      actorId: ctx.userId,
      action: "stock.transfer",
      entityType: "StockTransfer",
      entityId: transfer.id,
      summary: `Transferred ${quantity}× ${bottleSize}ml ${fragrance.brand.name} ${fragrance.model} from ${transfer.fromBranch.name} → ${transfer.toBranch.name}`,
      metadata: {
        fromBranchId,
        toBranchId,
        fragranceId,
        bottleSize,
        quantity,
        reason,
      },
    });

    const sourceAfter = await prisma.branchStock.findUnique({
      where: {
        branchId_fragranceId_bottleSize: {
          branchId: fromBranchId,
          fragranceId,
          bottleSize,
        },
      },
      select: { quantity: true },
    });
    const destAfter = await prisma.branchStock.findUnique({
      where: {
        branchId_fragranceId_bottleSize: {
          branchId: toBranchId,
          fragranceId,
          bottleSize,
        },
      },
      select: { quantity: true },
    });
    await checkLowStockForRows([
      {
        branchId: fromBranchId,
        branchName: fromBranch.name,
        fragranceId,
        bottleSize,
        quantity: Number(sourceAfter?.quantity || 0),
      },
      {
        branchId: toBranchId,
        branchName: toBranch.name,
        fragranceId,
        bottleSize,
        quantity: Number(destAfter?.quantity || 0),
      },
    ]);

    return NextResponse.json({ transfer, pending: false }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
