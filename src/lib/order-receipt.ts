import crypto from "crypto";
import { deliveryDateIso, formatDeliveryDateLabel } from "./delivery-dates";

export type ReceiptItem = {
  brand: string;
  model: string;
  reference?: string | null;
  quantity: number;
  price: number;
};

export type ReceiptOrder = {
  id: string;
  email: string;
  total: number;
  status: string;
  createdAt: Date;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostcode: string | null;
  shippingCountry: string | null;
  shippingMethod: string | null;
  shippingCost: number;
  shippingPhone: string | null;
  deliveryDate: Date | null;
  items: ReceiptItem[];
};

export function receiptShortId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export function receiptFilename(orderId: string): string {
  return `COSY-AURA-Receipt-${receiptShortId(orderId)}.pdf`;
}

function receiptSecret(): string {
  return (
    process.env.RECEIPT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "cosy-aura-receipt"
  );
}

export function receiptToken(orderId: string): string {
  return crypto
    .createHmac("sha256", receiptSecret())
    .update(orderId)
    .digest("hex")
    .slice(0, 32);
}

export function verifyReceiptToken(orderId: string, token: string | null): boolean {
  if (!token) return false;
  const expected = receiptToken(orderId);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function receiptItemsTotal(order: ReceiptOrder): number {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function receiptDeliveryLabel(order: ReceiptOrder): string | null {
  const iso = deliveryDateIso(order.deliveryDate);
  return iso ? formatDeliveryDateLabel(iso) : null;
}

export function receiptTrackUrl(order: ReceiptOrder, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/track?ref=${receiptShortId(order.id)}&email=${encodeURIComponent(order.email || "")}`;
}

export function formatReceiptMoney(amount: number): string {
  const value = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `GHS ${value}`;
}

export function toReceiptOrder(order: {
  id: string;
  email: string;
  total: number;
  status: string;
  createdAt: Date;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostcode: string | null;
  shippingCountry: string | null;
  shippingMethod: string | null;
  shippingCost: number;
  shippingPhone: string | null;
  deliveryDate: Date | null;
  items: Array<{
    price: number;
    quantity: number;
    fragrance: { model: string; reference?: string | null; brand: { name: string } };
  }>;
}): ReceiptOrder {
  return {
    id: order.id,
    email: order.email,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    shippingName: order.shippingName,
    shippingAddress: order.shippingAddress,
    shippingCity: order.shippingCity,
    shippingPostcode: order.shippingPostcode,
    shippingCountry: order.shippingCountry,
    shippingMethod: order.shippingMethod,
    shippingCost: order.shippingCost,
    shippingPhone: order.shippingPhone,
    deliveryDate: order.deliveryDate,
    items: order.items.map((item) => ({
      brand: item.fragrance.brand.name,
      model: item.fragrance.model,
      reference: item.fragrance.reference,
      quantity: item.quantity,
      price: item.price,
    })),
  };
}
