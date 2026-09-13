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
import { assertCreditSaleAllowed } from "@/lib/credit-eligibility";
import { createCreditAgreementRecord } from "@/lib/credit-agreement";

export type PosCartLine = {
  fragranceId: string;
  bottleSize: BottleSize;
  quantity: number;
  unitPriceGhs: number;
};

export type { PosDiscountInput } from "@/lib/pos-discount";

export type PosCreditInput = {
  customerIdNumber: string;
};

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
  credit?: PosCreditInput;
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

type PosSearchFragrance = {
  id: string;
  slug: string;
  model: string;
  reference: string;
  brand: { name: string };
  images: Array<{ url: string }>;
  barcodes: Array<{ bottleSize: number; barcode: string }>;
  branchStocks?: Array<{ bottleSize: number; quantity: number }>;
};

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function fuzzyTermMatchesFragrance(
  f: Pick<PosSearchFragrance, "model" | "reference" | "slug" | "brand">,
  term: string
): boolean {
  const t = term.toLowerCase();
  const fields = [f.model, f.reference, f.slug, f.brand.name].map((s) => s.toLowerCase());
  for (const field of fields) {
    if (field.includes(t)) return true;
    for (const word of field.split(/[\s-]+/)) {
      if (word.length >= 4 && t.length >= 4) {
        const maxDist = t.length >= 7 ? 2 : 1;
        if (levenshtein(word, t) <= maxDist) return true;
      }
    }
  }
  return false;
}

function posSearchSelect(branchId: string | undefined) {
  return {
    id: true,
    slug: true,
    model: true,
    reference: true,
    brand: { select: { name: true } },
    images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
    barcodes: { select: { bottleSize: true, barcode: true } },
    ...(branchId
      ? {
          branchStocks: {
            where: { branchId },
            select: { bottleSize: true, quantity: true },
          },
        }
      : {}),
  };
}

function mapFragrancesToPosProducts(fragrances: PosSearchFragrance[]) {
  return fragrances.flatMap((f) => {
    const sizes: BottleSize[] = [30, 50, 100];
    const stocks = f.branchStocks ?? [];
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

async function fuzzySearchPosProducts(
  terms: string[],
  branchId: string,
  limit: number
): Promise<PosSearchFragrance[]> {
  const brands = await prisma.brand.findMany({
    where: {
      OR: terms.map((term) => ({
        name: { contains: term, mode: "insensitive" as const },
      })),
    },
    select: { id: true, name: true },
    take: 8,
  });

  const brandTerms = new Set(
    brands.flatMap((b) => b.name.toLowerCase().split(/[\s-]+/))
  );
  const modelTerms = terms.filter((term) => {
    const lower = term.toLowerCase();
    if (brandTerms.has(lower)) return false;
    return !brands.some((b) => b.name.toLowerCase().includes(lower));
  });

  const where =
    brands.length > 0
      ? { brandId: { in: brands.map((b) => b.id) } }
      : {
          OR: terms.flatMap((term) => {
            const prefix = term.slice(0, Math.min(term.length >= 4 ? 2 : 3, term.length));
            return [
              { model: { contains: prefix, mode: "insensitive" as const } },
              { brand: { name: { contains: prefix, mode: "insensitive" as const } } },
            ];
          }),
        };

  const candidates = await prisma.fragrance.findMany({
    where,
    take: Math.max(limit * 4, 24),
    select: posSearchSelect(branchId || undefined),
  });

  return candidates
    .filter((f) => {
      const checks = modelTerms.length > 0 ? modelTerms : terms;
      return checks.every((term) => fuzzyTermMatchesFragrance(f, term));
    })
    .slice(0, limit);
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

  let fragrances = await prisma.fragrance.findMany({
    where,
    take: limit,
    select: posSearchSelect(branch?.id),
  });

  if (fragrances.length === 0) {
    fragrances = await fuzzySearchPosProducts(terms, branch?.id ?? "", limit);
  }

  return mapFragrancesToPosProducts(fragrances);
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

  const isCreditSale = input.paymentMethod === "CREDIT";
  let linkedUserId: string | null = null;

  if (isCreditSale) {
    const credit = input.credit;
    const name = input.customerName?.trim();
    const phone = input.customerPhone?.trim();
    const idNumber = credit?.customerIdNumber?.trim();
    if (!name) {
      return { ok: false, reason: "Customer name is required for credit sales" };
    }
    if (!phone) {
      return { ok: false, reason: "Customer phone is required for credit sales" };
    }
    if (!idNumber || idNumber.length < 4) {
      return { ok: false, reason: "Customer ID number is required for credit sales" };
    }

    const creditCheck = await assertCreditSaleAllowed({
      branchCountry: access.branch.country,
      customerEmail: input.customerEmail,
      customerPhone: phone,
    });
    if (!creditCheck.ok) {
      return { ok: false, reason: creditCheck.reason };
    }
    linkedUserId = creditCheck.userId;
  }

  const receiptNumber = await generateReceiptNumber(access.branch.country);
  const email =
    input.customerEmail?.trim().toLowerCase() ||
    `pos+${receiptNumber.toLowerCase()}@cosyaura.local`;
  const name = input.customerName?.trim() || "Walk-in customer";
  const phone = input.customerPhone?.trim() || null;

  const { orderLinesWithUnitCost } = await import("./cogs");
  const orderItemRows = await orderLinesWithUnitCost(
    items.map((item) => ({
      fragranceId: item.fragranceId,
      price: item.unitPriceGhs,
      quantity: item.quantity,
      bottleSize: item.bottleSize,
    }))
  );

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: linkedUserId,
        email,
        status: isCreditSale ? "PENDING" : "DELIVERED",
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
        posPaymentReference: isCreditSale
          ? null
          : input.paymentReference?.trim() || null,
        receiptNumber,
        posDiscountType: normalizedDiscount?.type ?? null,
        posDiscountValue: normalizedDiscount?.value ?? null,
        posDiscountAmount: discountAmount > 0 ? discountAmount : null,
        posNotes: input.notes?.trim() || null,
        fulfillmentBranchId: input.branchId,
        inventoryCommittedAt: null,
        items: { create: orderItemRows },
      },
      select: { id: true, receiptNumber: true, total: true },
    });

    if (isCreditSale && input.credit) {
      await createCreditAgreementRecord(tx, {
        orderId: created.id,
        userId: linkedUserId,
        totalGhs: total,
        customerIdNumber: input.credit.customerIdNumber,
      });
    }

    return created;
  });

  if (!isCreditSale) {
    await commitPosInventory(
      order.id,
      input.branchId,
      access.branch.country as ManagedStockCountry,
      items
    );
  }

  if (access.branch.country === "GH" && !isCreditSale) {
    const { hookOrderSalesJournal } = await import("./accounting-order-hook");
    hookOrderSalesJournal(order.id, {
      actorUserId: ctx.userId,
      isCreditSale: false,
    });
  }

  return {
    ok: true,
    orderId: order.id,
    receiptNumber: order.receiptNumber || receiptNumber,
    total: order.total,
  };
}

/** Release reserved stock when a credit agreement is fully paid. */
export async function releaseCreditOrderFulfillment(
  orderId: string,
  options?: { actorUserId?: string }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      fulfillmentBranch: { select: { country: true } },
      creditAgreement: { select: { status: true } },
    },
  });

  if (!order) return { ok: false, reason: "Order not found" };
  if (order.posPaymentMethod !== "CREDIT") {
    return { ok: false, reason: "Not a credit order" };
  }
  if (order.creditAgreement?.status !== "PAID") {
    return { ok: false, reason: "Credit agreement is not fully paid" };
  }
  if (!order.fulfillmentBranchId || !order.fulfillmentBranch) {
    return { ok: false, reason: "No branch on this order" };
  }

  const items: PosCartLine[] = order.items
    .filter((i) => isBottleSize(i.bottleSize))
    .map((i) => ({
      fragranceId: i.fragranceId,
      bottleSize: i.bottleSize,
      quantity: i.quantity,
      unitPriceGhs: i.price,
    }));

  if (!order.inventoryCommittedAt) {
    const stockCheck = await assertBranchStock(order.fulfillmentBranchId, items);
    if (!stockCheck.ok) return stockCheck;

    await commitPosInventory(
      orderId,
      order.fulfillmentBranchId,
      order.fulfillmentBranch.country as ManagedStockCountry,
      items
    );
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERED" },
  });

  if (order.fulfillmentBranch.country === "GH") {
    const { hookCreditOrderCogsJournal } = await import("./accounting-order-hook");
    hookCreditOrderCogsJournal(orderId, { actorUserId: options?.actorUserId });
  }

  return { ok: true };
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

