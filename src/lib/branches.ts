import { prisma } from "@/lib/prisma";
import type { ManagedStockCountry } from "@/lib/country-stock";
import { stockCountryForShopper } from "@/lib/country-stock";
import {
  getStoreConfig,
  normalizeWhatsAppPhone,
  type StoreWhatsAppCheckoutConfig,
} from "@/lib/store-config";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export async function ensureUniqueBranchSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "branch";
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const existing = await prisma.branch.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
  }
}

/** Pick the default active branch for a shopper/shipping country. */
export async function resolveFulfillmentBranchId(
  shippingCountry: string | null | undefined
): Promise<string | null> {
  const bucket = stockCountryForShopper(shippingCountry);
  if (!bucket) return null;

  const preferred = await prisma.branch.findFirst({
    where: { country: bucket, active: true, isDefault: true },
    select: { id: true },
  });
  if (preferred) return preferred.id;

  const any = await prisma.branch.findFirst({
    where: { country: bucket, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return any?.id || null;
}

/** Default (or first active) branch driving country-level commerce settings. */
export async function getDefaultBranchForCountry(country: string | null | undefined) {
  const bucket = stockCountryForShopper(country);
  if (!bucket) return null;

  const preferred = await prisma.branch.findFirst({
    where: { country: bucket, active: true, isDefault: true },
  });
  if (preferred) return preferred;

  return prisma.branch.findFirst({
    where: { country: bucket, active: true },
    orderBy: { createdAt: "asc" },
  });
}

export type CountryCommerceConfig = {
  country: ManagedStockCountry;
  branchId: string | null;
  branchName: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  whatsappEnabled: boolean;
  waMeUrl: string | null;
  codEnabled: boolean;
  pickupEnabled: boolean;
  dawuroboEnabled: boolean;
  shaqexpressEnabled: boolean;
  openingHours: string | null;
  deliveryNotes: string | null;
};

/**
 * Commerce rules for a shopper country, driven by the default fulfilment branch
 * with WhatsApp falling back to StoreConfig country numbers.
 */
export async function getCountryCommerceConfig(
  country: string | null | undefined
): Promise<CountryCommerceConfig | null> {
  const bucket = stockCountryForShopper(country);
  if (!bucket) return null;

  const [branch, store] = await Promise.all([
    getDefaultBranchForCountry(bucket),
    getStoreConfig(),
  ]);

  const branchWa = normalizeWhatsAppPhone(branch?.whatsappPhone || "");
  const storeWa = store.whatsappCheckoutNumbers[bucket] || "";
  const phone = branchWa.length >= 8 ? branchWa : storeWa || null;
  const whatsappEnabled = Boolean(store.whatsappCheckoutEnabled && phone);

  return {
    country: bucket,
    branchId: branch?.id || null,
    branchName: branch?.name || null,
    city: branch?.city || null,
    address:
      branch?.address ||
      (bucket === "GH" ? "15 Odaw Street, Kokomlemle, Accra" : null),
    phone: branch?.phone || null,
    whatsappPhone: phone,
    whatsappEnabled,
    waMeUrl: whatsappEnabled && phone ? `https://wa.me/${phone}` : null,
    codEnabled: branch?.codEnabled ?? true,
    pickupEnabled: Boolean(
      branch &&
        (branch.pickupEnabled || bucket === "GH" || bucket === "CM")
    ),
    dawuroboEnabled: branch?.dawuroboEnabled ?? true,
    shaqexpressEnabled: branch?.shaqexpressEnabled ?? true,
    openingHours: branch?.openingHours || null,
    deliveryNotes: branch?.deliveryNotes || null,
  };
}

/** Resolve WhatsApp with branch override (for APIs that already have StoreConfig). */
export function resolveWhatsAppWithBranchOverride(
  config: StoreWhatsAppCheckoutConfig,
  country: string | null | undefined,
  branchWhatsappPhone?: string | null
): { enabled: boolean; country: string | null; phone: string | null; waMeUrl: string | null } {
  const code = String(country || "")
    .trim()
    .toUpperCase();
  if (!config.whatsappCheckoutEnabled || !/^[A-Z]{2}$/.test(code)) {
    return { enabled: false, country: code || null, phone: null, waMeUrl: null };
  }
  const branchPhone = normalizeWhatsAppPhone(branchWhatsappPhone || "");
  const phone =
    (branchPhone.length >= 8 ? branchPhone : null) ||
    config.whatsappCheckoutNumbers[code] ||
    null;
  if (!phone) {
    return { enabled: false, country: code, phone: null, waMeUrl: null };
  }
  return {
    enabled: true,
    country: code,
    phone,
    waMeUrl: `https://wa.me/${phone}`,
  };
}

/** Recompute country pool quantity from sum of branch stock in that country. */
export async function syncCountryPoolFromBranches(
  fragranceId: string,
  country: ManagedStockCountry
) {
  const branches = await prisma.branch.findMany({
    where: { country, active: true },
    select: { id: true },
  });
  const branchIds = branches.map((b) => b.id);
  const agg = branchIds.length
    ? await prisma.branchStock.aggregate({
        where: { fragranceId, branchId: { in: branchIds } },
        _sum: { quantity: true },
      })
    : { _sum: { quantity: 0 } };
  const quantity = Number(agg._sum.quantity || 0);

  await prisma.fragranceCountryStock.upsert({
    where: {
      fragranceId_country: { fragranceId, country },
    },
    create: {
      fragranceId,
      country,
      quantity,
      inStock: quantity > 0,
    },
    update: {
      quantity,
      inStock: quantity > 0,
    },
  });

  return quantity;
}
