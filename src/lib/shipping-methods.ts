import type { ShippingMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export const DEFAULT_STANDARD_SHIPPING = {
  name: "Standard Shipping",
  slug: "standard",
  description: "Tracked delivery with discreet packaging",
  price: 5,
  eta: "5-10 business days",
  deliveryDaysMin: 5,
  deliveryDaysMax: 10,
  sortOrder: 0,
  enabled: true,
} as const;

export type CheckoutShippingMethod = Pick<
  ShippingMethod,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "price"
  | "eta"
  | "deliveryDaysMin"
  | "deliveryDaysMax"
>;

export function shippingDisplayName(method: Pick<CheckoutShippingMethod, "name" | "eta">): string {
  return `${method.name} · ${method.eta}`;
}

export async function seedDefaultShippingMethods(): Promise<void> {
  await prisma.shippingMethod.upsert({
    where: { slug: DEFAULT_STANDARD_SHIPPING.slug },
    update: {
      name: DEFAULT_STANDARD_SHIPPING.name,
      description: DEFAULT_STANDARD_SHIPPING.description,
      price: DEFAULT_STANDARD_SHIPPING.price,
      eta: DEFAULT_STANDARD_SHIPPING.eta,
      deliveryDaysMin: DEFAULT_STANDARD_SHIPPING.deliveryDaysMin,
      deliveryDaysMax: DEFAULT_STANDARD_SHIPPING.deliveryDaysMax,
      sortOrder: DEFAULT_STANDARD_SHIPPING.sortOrder,
      enabled: DEFAULT_STANDARD_SHIPPING.enabled,
    },
    create: {
      name: DEFAULT_STANDARD_SHIPPING.name,
      slug: DEFAULT_STANDARD_SHIPPING.slug,
      description: DEFAULT_STANDARD_SHIPPING.description,
      price: DEFAULT_STANDARD_SHIPPING.price,
      eta: DEFAULT_STANDARD_SHIPPING.eta,
      deliveryDaysMin: DEFAULT_STANDARD_SHIPPING.deliveryDaysMin,
      deliveryDaysMax: DEFAULT_STANDARD_SHIPPING.deliveryDaysMax,
      sortOrder: DEFAULT_STANDARD_SHIPPING.sortOrder,
      enabled: DEFAULT_STANDARD_SHIPPING.enabled,
    },
  });
}

export async function getActiveShippingMethods(): Promise<CheckoutShippingMethod[]> {
  let methods = await prisma.shippingMethod.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      eta: true,
      deliveryDaysMin: true,
      deliveryDaysMax: true,
    },
  });

  if (methods.length === 0) {
    await seedDefaultShippingMethods();
    methods = await prisma.shippingMethod.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        eta: true,
        deliveryDaysMin: true,
        deliveryDaysMax: true,
      },
    });
  }

  return methods;
}

/** Shipping method prices are stored in USD for Stripe checkout. */
export function toStripeShippingOptions(methods: CheckoutShippingMethod[]) {
  return methods.map((method) => ({
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: {
        amount: Math.round(method.price * 100),
        currency: "usd",
      },
      display_name: shippingDisplayName(method),
      delivery_estimate: {
        minimum: {
          unit: "business_day" as const,
          value: Math.max(method.deliveryDaysMin, 1),
        },
        maximum: {
          unit: "business_day" as const,
          value: Math.max(method.deliveryDaysMax, method.deliveryDaysMin, 1),
        },
      },
    },
  }));
}

export async function resolveShippingMethodLabel(
  stored: string | null | undefined
): Promise<string> {
  if (!stored) return "Shipping";

  const methods = await prisma.shippingMethod.findMany({
    select: { name: true, slug: true, eta: true },
  });

  const match = methods.find(
    (method) =>
      stored === method.slug ||
      stored === shippingDisplayName(method) ||
      stored.startsWith(`${method.name} ·`) ||
      stored.includes(method.name)
  );

  return match?.name ?? stored;
}

export function parseShippingMethodInput(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  const description = body.description != null ? String(body.description).trim() : null;
  const eta = String(body.eta || "").trim();
  const price = Number(body.price);
  const deliveryDaysMin = Number(body.deliveryDaysMin ?? 3);
  const deliveryDaysMax = Number(body.deliveryDaysMax ?? 10);
  const sortOrder = Number(body.sortOrder ?? 0);
  const enabled = body.enabled !== false;

  if (!name) {
    return { error: "Name is required" as const };
  }
  if (!eta) {
    return { error: "Delivery estimate is required" as const };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be zero or greater" as const };
  }
  if (!Number.isFinite(deliveryDaysMin) || deliveryDaysMin < 1) {
    return { error: "Minimum delivery days must be at least 1" as const };
  }
  if (!Number.isFinite(deliveryDaysMax) || deliveryDaysMax < deliveryDaysMin) {
    return { error: "Maximum delivery days must be at least the minimum" as const };
  }

  return {
    data: {
      name,
      slug: slugify(name),
      description: description || null,
      eta,
      price,
      deliveryDaysMin: Math.round(deliveryDaysMin),
      deliveryDaysMax: Math.round(deliveryDaysMax),
      sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
      enabled,
    },
  };
}
