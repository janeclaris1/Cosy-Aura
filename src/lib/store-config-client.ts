/**
 * Client-safe helpers for WhatsApp order messaging (no Prisma / server-only).
 */

export type WhatsAppCustomerDetails = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  region?: string;
};

export function buildWhatsAppOrderMessage(input: {
  kind: "cart" | "product";
  country?: string | null;
  lines: Array<{
    brand?: string;
    model: string;
    quantity: number;
    sizeMl?: number;
    priceLabel?: string;
  }>;
  totalLabel?: string;
  customerName?: string;
  customer?: WhatsAppCustomerDetails;
}): string {
  const header =
    input.kind === "cart"
      ? "Hello Cosy Aura — I'd like to place this order via WhatsApp:"
      : "Hello Cosy Aura — I'd like to order this fragrance via WhatsApp:";
  const lines = input.lines.map((line, i) => {
    const size = line.sizeMl ? ` · ${line.sizeMl}ml` : "";
    const price = line.priceLabel ? ` — ${line.priceLabel}` : "";
    const brand = line.brand ? `${line.brand} ` : "";
    return `${i + 1}. ${brand}${line.model}${size} × ${line.quantity}${price}`;
  });
  const parts = [header, "", ...lines];
  if (input.totalLabel) {
    parts.push("", `Total: ${input.totalLabel}`);
  }
  if (input.country) {
    parts.push(`Country: ${input.country}`);
  }

  const customer = input.customer || {};
  const name = customer.name || input.customerName;
  if (name || customer.email || customer.phone || customer.address) {
    parts.push("", "Customer details:");
    if (name) parts.push(`Name: ${name}`);
    if (customer.email) parts.push(`Email: ${customer.email}`);
    if (customer.phone) parts.push(`Phone: ${customer.phone}`);
    if (customer.address) parts.push(`Address: ${customer.address}`);
    if (customer.city) parts.push(`City: ${customer.city}`);
    if (customer.region) parts.push(`Region: ${customer.region}`);
    if (customer.postcode) parts.push(`Postcode: ${customer.postcode}`);
  } else if (input.customerName) {
    parts.push(`Name: ${input.customerName}`);
  }

  parts.push("", "Please confirm availability and payment details. Thank you!");
  return parts.join("\n");
}
