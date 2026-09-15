/** Client-safe shipping helpers (no Prisma / server-only imports). */

export type CheckoutShippingMethodShape = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  eta: string;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
};

export function shippingDisplayName(
  method: Pick<CheckoutShippingMethodShape, "name" | "eta">
): string {
  return `${method.name} · ${method.eta}`;
}

export function isPickupShippingMethod(method: {
  name?: string | null;
  slug?: string | null;
}): boolean {
  const slug = method.slug?.toLowerCase() ?? "";
  const name = method.name?.toLowerCase() ?? "";
  return slug === "pickup" || /\bpickup\b/.test(name);
}

/** Shop pickup is Accra-only — hide for customers outside Ghana. */
export function filterShippingMethodsForCountry<
  T extends { name: string; slug?: string | null },
>(methods: T[], country: string | null | undefined): T[] {
  if (country === "GH") return methods;
  return methods.filter((method) => !isPickupShippingMethod(method));
}
