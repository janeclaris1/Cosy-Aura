import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBottleSize } from "@/lib/bottle-sizes";
import { fetchRatesFromGhs } from "@/lib/fx";
import { applyRegionalMarkup } from "@/lib/regional-pricing";
import {
  applyMemberDiscount,
  SAMPLE_SIZE_ML,
  sampleSalePrice,
  salePriceForSize,
} from "@/lib/pricing";
import { isGuestPriceHidden } from "@/lib/catalog-price-visibility";
import { isPerfumeProduct } from "@/lib/product-catalog";
import { getStoreConfig, getStorePricingConfig } from "@/lib/store-config";
import { applyDiscoveryBundleDiscount } from "@/lib/discovery-bundle";

export type CartLineInput = {
  fragranceId: string;
  quantity: number;
  bottleSize?: number;
  model?: string;
};

export type PricedCartLine = CartLineInput & {
  price: number;
};

function lineBaseGhs(
  slug: string,
  bottleSize?: number,
  model?: string
): number {
  if (bottleSize === SAMPLE_SIZE_ML || model?.toLowerCase().includes("sample")) {
    return sampleSalePrice();
  }
  const size =
    bottleSize !== undefined && isBottleSize(bottleSize) ? bottleSize : 50;
  return salePriceForSize(size, slug);
}

export type CheckoutMemberContext = {
  userId: string | null;
  applyMemberDiscount: boolean;
};

/** Logged-in member accounts get the permanent member discount. */
export async function getCheckoutMemberContext(): Promise<CheckoutMemberContext> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;
  if (!userId) {
    return { userId: null, applyMemberDiscount: false };
  }

  const fromToken = Boolean(
    (session?.user as { memberDiscount?: boolean } | undefined)?.memberDiscount
  );
  if (fromToken) {
    return { userId, applyMemberDiscount: true };
  }

  // Fallback if JWT was issued before memberDiscount was added to the token
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { memberDiscount: true },
  });

  return {
    userId,
    applyMemberDiscount: Boolean(user?.memberDiscount),
  };
}

/** Guests cannot checkout catalog items whose prices are hidden until they sign in. */
export async function assertGuestCanCheckoutItems(
  items: CartLineInput[],
  userId: string | null
): Promise<void> {
  if (userId || !items.length) return;

  const config = await getStoreConfig();
  if (!config.guestHiddenPriceCatalogs.length) return;

  const rows = await prisma.fragrance.findMany({
    where: { id: { in: [...new Set(items.map((item) => item.fragranceId))] } },
    select: { productType: true },
  });

  for (const row of rows) {
    if (
      isGuestPriceHidden(row.productType, config.guestHiddenPriceCatalogs, false)
    ) {
      throw new Error("SIGN_IN_REQUIRED_FOR_PRICING");
    }
  }
}

/** Server-side cart pricing — ignores client-submitted prices. */
export async function priceCartLines(
  items: CartLineInput[],
  shopperCountry: string | null | undefined,
  options?: { applyMemberDiscount?: boolean }
): Promise<PricedCartLine[]> {
  if (!items.length) return [];

  const [config, fx] = await Promise.all([
    getStorePricingConfig(),
    fetchRatesFromGhs(),
  ]);

  const fragranceIds = [...new Set(items.map((item) => item.fragranceId))];
  const fragrances = await prisma.fragrance.findMany({
    where: { id: { in: fragranceIds } },
    select: { id: true, slug: true, productType: true, price: true },
  });
  const slugById = new Map(fragrances.map((row) => [row.id, row.slug]));
  const catalogById = new Map(fragrances.map((row) => [row.id, row]));
  const withMember = Boolean(options?.applyMemberDiscount);

  const priced = items.map((item) => {
    const slug = slugById.get(item.fragranceId);
    if (!slug) {
      throw new Error("One or more products in your cart are no longer available.");
    }

    const product = catalogById.get(item.fragranceId);
    let baseGhs = isPerfumeProduct(product?.productType)
      ? lineBaseGhs(slug, item.bottleSize, item.model)
      : Number(product?.price ?? 0);
    if (withMember) {
      baseGhs = applyMemberDiscount(baseGhs);
    }
    const price = applyRegionalMarkup(baseGhs, {
      country: shopperCountry,
      rates: fx.rates,
      enabled: config.nonAfricaMarkupEnabled,
      markupUsd: config.nonAfricaMarkupUsd,
      productType: product?.productType,
      catalogMarkupUsd: config.catalogMarkupUsd,
    });

    return {
      ...item,
      price,
    };
  });

  return applyDiscoveryBundleDiscount(priced);
}

export function cartLinesTotal(items: PricedCartLine[]): number {
  return items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
}
