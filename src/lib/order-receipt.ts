import crypto from "crypto";
import type { OrderChannel, PosPaymentMethod } from "@prisma/client";
import { deliveryDateIso, formatDeliveryDateLabel } from "./delivery-dates";
import { paymentGatewayLabel } from "./order-payment";

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
  receiptNumber?: string | null;
  total: number;
  status: string;
  createdAt: Date;
  channel: OrderChannel;
  paymentProvider: string | null;
  posPaymentMethod: PosPaymentMethod | null;
  chargeCurrency: string | null;
  dawuroboPayer: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostcode: string | null;
  shippingCountry: string | null;
  shippingRegion: string | null;
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

export function receiptPaymentMethodLabel(order: {
  channel: OrderChannel;
  paymentProvider: string | null;
  posPaymentMethod: PosPaymentMethod | null;
  chargeCurrency: string | null;
  status: string;
  dawuroboPayer: string | null;
}): string {
  if (order.dawuroboPayer === "cod") return "Cash on delivery";
  return paymentGatewayLabel(order);
}

export function receiptCustomerAddressLines(order: ReceiptOrder): string[] {
  const lines: string[] = [];
  const street = order.shippingAddress?.trim();
  if (street) lines.push(street);

  const cityLine = [order.shippingCity?.trim(), order.shippingPostcode?.trim()]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);

  const region = order.shippingRegion?.trim();
  if (region) lines.push(region);

  const country = order.shippingCountry?.trim();
  if (country) lines.push(country);

  return lines;
}

export function receiptBillToLines(order: ReceiptOrder): string[] {
  const lines: string[] = [];
  const name = order.shippingName?.trim();
  if (name) lines.push(name);

  const email = order.email?.trim();
  if (email) lines.push(email);

  const phone = order.shippingPhone?.trim();
  if (phone) lines.push(phone);

  return lines.length ? lines : ["-"];
}

export function receiptShipToLines(order: ReceiptOrder): string[] {
  const lines: string[] = [];
  const name = order.shippingName?.trim();
  if (name) lines.push(name);

  lines.push(...receiptCustomerAddressLines(order));

  const email = order.email?.trim();
  if (email) lines.push(email);

  const phone = order.shippingPhone?.trim();
  if (phone) lines.push(phone);

  const payment = receiptPaymentMethodLabel(order);
  if (payment && payment !== "—") {
    lines.push(`Payment: ${payment}`);
  }

  return lines.length ? lines : ["-"];
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
  receiptNumber?: string | null;
  total: number;
  status: string;
  createdAt: Date;
  channel?: OrderChannel;
  paymentProvider?: string | null;
  posPaymentMethod?: PosPaymentMethod | null;
  chargeCurrency?: string | null;
  dawuroboPayer?: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostcode: string | null;
  shippingCountry: string | null;
  shippingRegion?: string | null;
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
    receiptNumber: order.receiptNumber,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    channel: order.channel ?? "WEB",
    paymentProvider: order.paymentProvider ?? null,
    posPaymentMethod: order.posPaymentMethod ?? null,
    chargeCurrency: order.chargeCurrency ?? null,
    dawuroboPayer: order.dawuroboPayer ?? null,
    shippingName: order.shippingName,
    shippingAddress: order.shippingAddress,
    shippingCity: order.shippingCity,
    shippingPostcode: order.shippingPostcode,
    shippingCountry: order.shippingCountry,
    shippingRegion: order.shippingRegion ?? null,
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
