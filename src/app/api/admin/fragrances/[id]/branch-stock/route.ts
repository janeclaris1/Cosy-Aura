import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, scopedBranchIds } from "@/lib/admin";
import { syncCountryPoolFromBranches } from "@/lib/branches";
import type { ManagedStockCountry } from "@/lib/country-stock";
import { BOTTLE_SIZES, isBottleSize, type BottleSize } from "@/lib/bottle-sizes";
import { isPerfumeProduct } from "@/lib/product-catalog";
import { writeAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

function qtyBySize(
  stocks: Array<{ bottleSize: number; quantity: number }>
): Record<BottleSize, number> {
  const out: Record<BottleSize, number> = { 30: 0, 50: 0, 100: 0 };
  for (const s of stocks) {
    if (isBottleSize(s.bottleSize)) out[s.bottleSize] = s.quantity;
  }
  return out;
}

/** Branch stock for one product (all accessible branches). */
export async function GET(_req: Request, { params }: Params) {
  const { ctx, error } = await requireAdminApi("stock.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: fragranceId } = await params;
  const fragrance = await prisma.fragrance.findUnique({
    where: { id: fragranceId },
    select: {
      id: true,
      model: true,
      productType: true,
      brand: { select: { name: true } },
    },
  });

  if (!fragrance) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const scope = scopedBranchIds(ctx);
  const branchWhere =
    scope === "all"
      ? ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry
        ? { country: ctx.staffCountry, active: true }
        : { active: true }
      : { id: { in: scope }, active: true };

  const branches = await prisma.branch.findMany({
    where: branchWhere,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      country: true,
      stocks: {
        where: { fragranceId },
        select: { bottleSize: true, quantity: true },
      },
    },
  });

  return NextResponse.json({
    productType: fragrance.productType,
    perfume: isPerfumeProduct(fragrance.productType),
    bottleSizes: BOTTLE_SIZES,
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      country: b.country,
      quantities: qtyBySize(b.stocks),
    })),
  });
}

/** Update branch stock for one product across branches. */
export async function PATCH(req: Request, { params }: Params) {
  const { ctx, error } = await requireAdminApi("stock.write");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: fragranceId } = await params;
  const fragrance = await prisma.fragrance.findUnique({
    where: { id: fragranceId },
    select: { id: true, model: true, productType: true },
  });

  if (!fragrance) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Array<{ branchId: string; bottleSize: number; quantity: number }> =
    Array.isArray(body.updates) ? body.updates : [];

  if (!updates.length) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const scope = scopedBranchIds(ctx);
  const touchedCountries = new Set<ManagedStockCountry>();

  for (const row of updates) {
    const branchId = String(row.branchId || "");
    const bottleSize = Number(row.bottleSize);
    const quantity = Math.max(0, Math.floor(Number(row.quantity) || 0));

    if (!branchId || !isBottleSize(bottleSize)) continue;

    if (scope !== "all" && !scope.includes(branchId)) continue;

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch?.active) continue;

    if (
      ctx.staffRole === "COUNTRY_MANAGER" &&
      ctx.staffCountry &&
      branch.country !== ctx.staffCountry
    ) {
      continue;
    }

    await prisma.branchStock.upsert({
      where: {
        branchId_fragranceId_bottleSize: { branchId, fragranceId, bottleSize },
      },
      create: { branchId, fragranceId, bottleSize, quantity },
      update: { quantity },
    });

    touchedCountries.add(branch.country as ManagedStockCountry);
  }

  for (const country of touchedCountries) {
    await syncCountryPoolFromBranches(fragranceId, country);
  }

  await writeAuditLog({
    actorId: ctx.userId,
    action: "stock.update",
    entityType: "Fragrance",
    entityId: fragranceId,
    summary: `Updated branch stock for ${fragrance.model}`,
    metadata: { fragranceId, updateCount: updates.length },
  });

  return NextResponse.json({ ok: true });
}
