import type { PosPaymentMethod } from "@prisma/client";
import {
  computePosDiscountAmount,
  normalizePosDiscount,
  type PosDiscountInput,
} from "@/lib/pos-discount";
import { prisma } from "@/lib/prisma";
import { syncCountryPoolFromBranches } from "@/lib/branches";
import type { ManagedStockCountry } from "@/lib/country-stock";
import { isBottleSize, type BottleSize } from "@/lib/bottle-sizes";
import { salePriceForSize } from "@/lib/pricing";
import type { AdminContext } from "@/lib/admin";
import { scopedBranchIds } from "@/lib/admin";
import { restoreOrderInventory } from "@/lib/inventory";
import { normalizeBarcode } from "@/lib/barcodes";

export type PosCartLine = {
  fragranceId: string;
  bottleSize: BottleSize;
  quantity: number;
  unitPriceGhs: number;
};

export type { PosDiscountInput } from "@/lib/pos-discount";

export type PosSaleInput = {
  branchId: string;
  items: PosCartLine[];
  paymentMethod: PosPaymentMethod;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  amountTendered?: number;
  paymentReference?: string;
  discount?: PosDiscountInput | null;
};

function roundGhs(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export { normalizeBarcode, syncFragranceBarcodes } from "@/lib/barcodes";

/** Whether this admin may sell at the given branch. */
export async function assertPosBranchAccess(
  ctx: AdminContext,
  branchId: string
): Promise<{ ok: true; branch: { id: string; name: string; country: string; city: string | null; address: string | null } } | { ok: false; reason: string }> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, active: true },
    select: { id: true, name: true, country: true, city: true, address: true },
  });
  if (!branch) return { ok: false, reason: "Branch not found" };

  const scope = scopedBranchIds(ctx);
  if (scope === "all") {
    if (ctx.staffRole === "COUNTRY_MANAGER" && ctx.staffCountry) {
      if (branch.country.toUpperCase() !== ctx.staffCountry.toUpperCase()) {
        return { ok: false, reason: "Branch is outside your country scope" };
      }
    }
    return { ok: true, branch };
  }

  if (!scope.includes(branchId)) {
    return { ok: false, reason: "You are not assigned to this branch" };
  }
  return { ok: true, branch };
}

export async function lookupBarcodeForBranch(
  barcode: string,
  branchId: string
): Promise<
  | {
      ok: true;
      product: {
        fragranceId: string;
        slug: string;
        brand: string;
        model: string;
        reference: string;
        bottleSize: BottleSize;
        barcode: string;
        unitPriceGhs: number;
        branchQty: number;
        imageUrl: string | null;
      };
    }
  | { ok: false; reason: string }
> {
  const code = normalizeBarcode(barcode);
  if (!code) return { ok: false, reason: "Empty barcode" };

  const row = await prisma.fragranceBarcode.findUnique({
    where: { barcode: code },
    include: {
      fragrance: {
        select: {
          id: true,
          slug: true,
          model: true,
          reference: true,
          brand: { select: { name: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });
  if (!row || !isBottleSize(row.bottleSize)) {
    return { ok: false, reason: "Product not found for this barcode" };
  }

  const stock = await prisma.branchStock.findUnique({
    where: {
      branchId_fragranceId_bottleSize: {
        branchId,
        fragranceId: row.fragranceId,
        bottleSize: row.bottleSize,
      },
    },
    select: { quantity: true },
  });

  return {
    ok: true,
    product: {
      fragranceId: row.fragranceId,
      slug: row.fragrance.slug,
      brand: row.fragrance.brand.name,
      model: row.fragrance.model,
      reference: row.fragrance.reference,
      bottleSize: row.bottleSize,
      barcode: row.barcode,
      unitPriceGhs: salePriceForSize(row.bottleSize, row.fragrance.slug),
      branchQty: Number(stock?.quantity || 0),
      imageUrl: row.fragrance.images[0]?.url || null,
    },
  };
}

function posSearchTermClause(term: string) {
  return {
    OR: [
      { model: { contains: term, mode: "insensitive" as const } },
      { reference: { contains: term, mode: "insensitive" as const } },
      { slug: { contains: term, mode: "insensitive" as const } },
      { brand: { name: { contains: term, mode: "insensitive" as const } } },
    ],
  };
}

export async function searchPosProducts(
  query: string,
  branchId: string,
  limit = 12
) {
  const q = query.trim();
  if (q.length < 2) return [];

  const branch = branchId
    ? await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      })
    : null;

  const terms = q.split(/\s+/).filter(Boolean);
  const where =
    terms.length <= 1
      ? posSearchTermClause(terms[0] || q)
      : {
          OR: [
            posSearchTermClause(q),
            { AND: terms.map((term) => posSearchTermClause(term)) },
          ],
        };

  const fragrances = await prisma.fragrance.findMany({
    where,
    take: limit,
    select: {
      id: true,
      slug: true,
      model: true,
      reference: true,
      brand: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      barcodes: { select: { bottleSize: true, barcode: true } },
      ...(branch
        ? {
            branchStocks: {
              where: { branchId: branch.id },
              select: { bottleSize: true, quantity: true },
            },
          }
        : {}),
    },
  });

  return fragrances.flatMap((f) => {
    const sizes: BottleSize[] = [30, 50, 100];
    const stocks = "branchStocks" in f ? f.branchStocks : [];
    return sizes.map((size) => {
      const stock = stocks.find((s) => s.bottleSize === size);
      const barcode = f.barcodes.find((b) => b.bottleSize === size)?.barcode || null;
      return {
        fragranceId: f.id,
        slug: f.slug,
        brand: f.brand.name,
        model: f.model,
        reference: f.reference,
        bottleSize: size,
        barcode,
        unitPriceGhs: salePriceForSize(size, f.slug),
        branchQty: Number(stock?.quantity || 0),
        imageUrl: f.images[0]?.url || null,
      };
    });
  });
}

async function assertBranchStock(
  branchId: string,
  items: PosCartLine[]
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const needed = new Map<string, number>();
  for (const item of items) {
    const key = `${item.fragranceId}:${item.bottleSize}`;
    needed.set(key, (needed.get(key) || 0) + item.quantity);
  }

  for (const [key, qty] of needed) {
    const [fragranceId, sizeStr] = key.split(":");
    const bottleSize = Number(sizeStr);
    if (!isBottleSize(bottleSize)) {
      return { ok: false, reason: "Invalid bottle size" };
    }
    const stock = await prisma.branchStock.findUnique({
      where: {
        branchId_fragranceId_bottleSize: {
          branchId,
          fragranceId,
          bottleSize,
        },
      },
      select: { quantity: true },
    });
    const available = Number(stock?.quantity || 0);
    if (available < qty) {
      return {
        ok: false,
        reason: `Insufficient stock at branch (${available} available, ${qty} requested)`,
      };
    }
  }
  return { ok: true };
}

function mergeCartLines(items: PosCartLine[]): PosCartLine[] {
  const map = new Map<string, PosCartLine>();
  for (const item of items) {
    const key = `${item.fragranceId}:${item.bottleSize}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(key, { ...item });
    }
  }
  return [...map.values()];
}

async function generateReceiptNumber(country: string): Promise<string> {
  const cc = country.toUpperCase().slice(0, 2);
  const date = new Date();
  const ymd = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");

  for (let attempt = 0; attempt < 8; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const receiptNumber = `POS-${cc}-${ymd}-${suffix}`;
    const exists = await prisma.order.findUnique({
      where: { receiptNumber },
      select: { id: true },
    });
    if (!exists) return receiptNumber;
  }
  return `POS-${cc}-${ymd}-${Date.now().toString(36).toUpperCase()}`;
}

async function commitPosInventory(
  orderId: string,
  branchId: string,
  country: ManagedStockCountry,
  items: PosCartLine[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const existing = await tx.branchStock.findUnique({
        where: {
          branchId_fragranceId_bottleSize: {
            branchId,
            fragranceId: item.fragranceId,
            bottleSize: item.bottleSize,
          },
        },
      });
      const nextQty = Math.max(0, Number(existing?.quantity || 0) - item.quantity);
      if (existing) {
        await tx.branchStock.update({
          where: { id: existing.id },
          data: { quantity: nextQty },
        });
      } else {
        await tx.branchStock.create({
          data: {
            branchId,
            fragranceId: item.fragranceId,
            bottleSize: item.bottleSize,
            quantity: 0,
          },
        });
      }
    }
    await tx.order.update({
      where: { id: orderId },
      data: { inventoryCommittedAt: new Date() },
    });
  });

  const fragranceIds = [...new Set(items.map((i) => i.fragranceId))];
  for (const fragranceId of fragranceIds) {
    await syncCountryPoolFromBranches(fragranceId, country);
  }
}

export async function createPosSale(
  ctx: AdminContext,
  input: PosSaleInput
): Promise<
  | { ok: true; orderId: string; receiptNumber: string; total: number }
  | { ok: false; reason: string }
> {
  const access = await assertPosBranchAccess(ctx, input.branchId);
  if (!access.ok) return { ok: false, reason: access.reason };

  const items = mergeCartLines(
    input.items.filter((i) => i.quantity > 0 && isBottleSize(i.bottleSize))
  );
  if (!items.length) return { ok: false, reason: "Cart is empty" };

  const stockCheck = await assertBranchStock(input.branchId, items);
  if (!stockCheck.ok) return stockCheck;

  const subtotal = roundGhs(
    items.reduce((sum, i) => sum + i.unitPriceGhs * i.quantity, 0)
  );
  const normalizedDiscount = normalizePosDiscount(input.discount);
  const discountAmount = computePosDiscountAmount(subtotal, normalizedDiscount);
  const total = roundGhs(Math.max(0, subtotal - discountAmount));

  const receiptNumber = await generateReceiptNumber(access.branch.country);
  const email =
    input.customerEmail?.trim().toLowerCase() ||
    `pos+${receiptNumber.toLowerCase()}@cosyaura.local`;
  const name = input.customerName?.trim() || "Walk-in customer";
  const phone = input.customerPhone?.trim() || null;

  const order = await prisma.order.create({
    data: {
      email,
      status: "DELIVERED",
      total,
      shippingCost: 0,
      shippingName: name,
      shippingPhone: phone,
      shippingCountry: access.branch.country,
      shippingCity: access.branch.city,
      shippingAddress: access.branch.address || access.branch.name,
      shippingMethod: "POS_WALK_IN",
      paymentProvider: "pos",
      channel: "POS",
      posUserId: ctx.userId,
      posPaymentMethod: input.paymentMethod,
      posPaymentReference: input.paymentReference?.trim() || null,
      receiptNumber,
      posDiscountType: normalizedDiscount?.type ?? null,
      posDiscountValue: normalizedDiscount?.value ?? null,
      posDiscountAmount: discountAmount > 0 ? discountAmount : null,
      posNotes: input.notes?.trim() || null,
      fulfillmentBranchId: input.branchId,
      inventoryCommittedAt: null,
      items: {
        create: items.map((item) => ({
          fragranceId: item.fragranceId,
          price: item.unitPriceGhs,
          quantity: item.quantity,
          bottleSize: item.bottleSize,
        })),
      },
    },
    select: { id: true, receiptNumber: true, total: true },
  });

  await commitPosInventory(
    order.id,
    input.branchId,
    access.branch.country as ManagedStockCountry,
    items
  );

  return {
    ok: true,
    orderId: order.id,
    receiptNumber: order.receiptNumber || receiptNumber,
    total: order.total,
  };
}

/** Void/refund a POS sale and restore branch stock. */
export async function voidPosSale(
  ctx: AdminContext,
  orderId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      channel: true,
      status: true,
      fulfillmentBranchId: true,
      inventoryCommittedAt: true,
      receiptNumber: true,
    },
  });

  if (!order) return { ok: false, reason: "Order not found" };
  if (order.channel !== "POS") {
    return { ok: false, reason: "Only POS orders can be voided here" };
  }
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, reason: "Sale already voided" };
  }
  if (!order.fulfillmentBranchId) {
    return { ok: false, reason: "No branch on this sale" };
  }

  const access = await assertPosBranchAccess(ctx, order.fulfillmentBranchId);
  if (!access.ok) return { ok: false, reason: access.reason };

  if (order.inventoryCommittedAt) {
    const restored = await restoreOrderInventory(orderId);
    if (!restored.ok) return { ok: false, reason: restored.reason || "Restore failed" };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "REFUNDED" },
  });

  return { ok: true };
}

