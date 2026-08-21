import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, scopedBranchIds } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { syncCountryPoolFromBranches } from "@/lib/branches";
import type { ManagedStockCountry } from "@/lib/country-stock";
import { BOTTLE_SIZES, isBottleSize, type BottleSize } from "@/lib/bottle-sizes";
import { checkLowStockForRows } from "@/lib/low-stock";

type Params = { params: Promise<{ id: string }> };

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

function qtyBySize(
  stocks: Array<{ bottleSize: number; quantity: number }>
): Record<BottleSize, number> {
  const out: Record<BottleSize, number> = { 30: 0, 50: 0, 100: 0 };
  for (const s of stocks) {
    if (isBottleSize(s.bottleSize)) out[s.bottleSize] = s.quantity;
  }
  return out;
}

/** List stock rows for a branch (with fragrance info + size variants). */
export async function GET(_req: Request, { params }: Params) {
  const { ctx, error } = await requireAdminApi("stock.read");
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

  const fragrances = await prisma.fragrance.findMany({
    orderBy: [{ brand: { name: "asc" } }, { model: "asc" }],
    select: {
      id: true,
      model: true,
      slug: true,
      reference: true,
      brand: { select: { name: true } },
      branchStocks: {
        where: { branchId },
        select: { bottleSize: true, quantity: true },
      },
      countryStocks: {
        where: { country: branch.country },
        select: { quantity: true, inStock: true },
      },
    },
  });

  return NextResponse.json({
    branch,
    bottleSizes: BOTTLE_SIZES,
    rows: fragrances.map((f) => {
      const quantities = qtyBySize(f.branchStocks);
      return {
        fragranceId: f.id,
        model: f.model,
        slug: f.slug,
        reference: f.reference,
        brand: f.brand.name,
        quantities,
        countryPool: f.countryStocks[0]?.quantity ?? 0,
        countryInStock: f.countryStocks[0]?.inStock ?? false,
      };
    }),
  });
}

/** Set absolute quantities for fragrance + bottle size at this branch. */
export async function PATCH(req: Request, { params }: Params) {
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
  const updates: Array<{ fragranceId: string; bottleSize: number; quantity: number }> =
    Array.isArray(body.updates)
      ? body.updates
      : body.fragranceId
        ? [
            {
              fragranceId: String(body.fragranceId),
              bottleSize: Number(body.bottleSize ?? 50),
              quantity: Number(body.quantity),
            },
          ]
        : [];

  if (!updates.length) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const touched = new Set<string>();
  const lowStockCheck: Array<{
    branchId: string;
    branchName: string;
    fragranceId: string;
    bottleSize: number;
    quantity: number;
  }> = [];
  for (const row of updates) {
    const fragranceId = String(row.fragranceId || "");
    const bottleSize = Number(row.bottleSize);
    const quantity = Math.max(0, Math.floor(Number(row.quantity) || 0));
    if (!fragranceId || !isBottleSize(bottleSize)) continue;
    await prisma.branchStock.upsert({
      where: {
        branchId_fragranceId_bottleSize: { branchId, fragranceId, bottleSize },
      },
      create: { branchId, fragranceId, bottleSize, quantity },
      update: { quantity },
    });
    touched.add(fragranceId);
    lowStockCheck.push({
      branchId,
      branchName: branch.name,
      fragranceId,
      bottleSize,
      quantity,
    });
  }

  for (const fragranceId of touched) {
    await syncCountryPoolFromBranches(
      fragranceId,
      branch.country as ManagedStockCountry
    );
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "stock.update",
    entityType: "Branch",
    entityId: branchId,
    summary: `Updated stock for ${touched.size} product(s) at ${branch.name}`,
    metadata: { branchId, updateCount: updates.length, fragranceIds: [...touched] },
  });

  await checkLowStockForRows(lowStockCheck);

  return NextResponse.json({ ok: true, updated: touched.size });
}
