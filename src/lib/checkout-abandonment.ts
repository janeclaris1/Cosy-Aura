import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CheckoutAbandonmentItem = {
  fragranceId: string;
  quantity: number;
  price: number;
  bottleSize?: number;
  brand?: string;
  model?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS = 40;
const MAX_QTY = 25;

export function normalizeCheckoutEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidCheckoutEmail(email: string): boolean {
  const normalized = normalizeCheckoutEmail(email);
  return normalized.length <= 320 && EMAIL_RE.test(normalized);
}

export function sanitizeAbandonmentItems(
  raw: unknown
): CheckoutAbandonmentItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ITEMS) {
    return null;
  }

  const items: CheckoutAbandonmentItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const entry = row as Record<string, unknown>;
    const fragranceId = String(entry.fragranceId || "").trim();
    const quantity = Math.floor(Number(entry.quantity));
    const price = Number(entry.price);
    if (!fragranceId || !Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) {
      return null;
    }
    if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return null;

    items.push({
      fragranceId,
      quantity,
      price,
      ...(entry.bottleSize != null
        ? { bottleSize: Math.floor(Number(entry.bottleSize)) || undefined }
        : {}),
      ...(entry.brand ? { brand: String(entry.brand).slice(0, 120) } : {}),
      ...(entry.model ? { model: String(entry.model).slice(0, 160) } : {}),
    });
  }

  return items;
}

export type UpsertCheckoutAbandonmentInput = {
  email: string;
  items: CheckoutAbandonmentItem[];
  subtotalGhs: number;
  displayCurrency?: string | null;
  shippingCountry?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  checkoutProvider?: string | null;
};

export async function upsertCheckoutAbandonment(
  input: UpsertCheckoutAbandonmentInput
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const email = normalizeCheckoutEmail(input.email);
  if (!isValidCheckoutEmail(email)) {
    return { ok: false, reason: "Invalid email" };
  }

  const items = sanitizeAbandonmentItems(input.items);
  if (!items) return { ok: false, reason: "Invalid cart items" };

  const subtotalGhs = Number(input.subtotalGhs);
  if (!Number.isFinite(subtotalGhs) || subtotalGhs < 0) {
    return { ok: false, reason: "Invalid subtotal" };
  }

  const session = await getServerSession(authOptions);
  const userId =
    session?.user?.id &&
    (session.user as { role?: string }).role === "USER"
      ? session.user.id
      : null;

  const data: Prisma.CheckoutAbandonmentUpdateInput = {
    items,
    subtotalGhs,
    displayCurrency: input.displayCurrency?.trim().slice(0, 8) || null,
    shippingCountry: input.shippingCountry?.trim().toUpperCase().slice(0, 2) || null,
    customerName: input.customerName?.trim().slice(0, 200) || null,
    customerPhone: input.customerPhone?.trim().slice(0, 40) || null,
    checkoutProvider: input.checkoutProvider?.trim().slice(0, 40) || null,
    lastSeenAt: new Date(),
    ...(userId ? { user: { connect: { id: userId } } } : {}),
  };

  const existing = await prisma.checkoutAbandonment.findFirst({
    where: { email, status: "ACTIVE" },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    await prisma.checkoutAbandonment.update({
      where: { id: existing.id },
      data,
    });
    return { ok: true, id: existing.id };
  }

  const created = await prisma.checkoutAbandonment.create({
    data: {
      email,
      items,
      subtotalGhs,
      displayCurrency: input.displayCurrency?.trim().slice(0, 8) || null,
      shippingCountry: input.shippingCountry?.trim().toUpperCase().slice(0, 2) || null,
      customerName: input.customerName?.trim().slice(0, 200) || null,
      customerPhone: input.customerPhone?.trim().slice(0, 40) || null,
      checkoutProvider: input.checkoutProvider?.trim().slice(0, 40) || null,
      ...(userId ? { user: { connect: { id: userId } } } : {}),
    },
  });

  return { ok: true, id: created.id };
}

/** Link an in-progress checkout to a pending order once payment starts. */
export async function linkCheckoutAbandonmentToOrder(
  email: string,
  orderId: string
): Promise<void> {
  const normalized = normalizeCheckoutEmail(email);
  if (!isValidCheckoutEmail(normalized)) return;

  await prisma.checkoutAbandonment.updateMany({
    where: { email: normalized, status: "ACTIVE" },
    data: { orderId, lastSeenAt: new Date() },
  });
}

/** Mark abandonments as converted after successful payment. */
export async function markCheckoutAbandonmentsConverted(
  email: string,
  orderId: string
): Promise<void> {
  const normalized = normalizeCheckoutEmail(email);
  if (!isValidCheckoutEmail(normalized)) return;

  await prisma.checkoutAbandonment.updateMany({
    where: {
      email: normalized,
      status: "ACTIVE",
    },
    data: {
      status: "CONVERTED",
      orderId,
      lastSeenAt: new Date(),
    },
  });
}
