import type { ProductType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { parseGuestHiddenPriceCatalogs } from "@/lib/catalog-price-visibility";
import {
  parsePdpSponsoredAd,
  validatePdpSponsoredAd,
} from "@/lib/pdp-sponsored-ad";
import {
  getStoreConfig,
  upsertStoreConfig,
  type WhatsAppCheckoutNumbers,
} from "@/lib/store-config";
import { revalidatePath } from "next/cache";

export async function GET() {
  const { error } = await requireAdminApi("settings.write");
  if (error) return error;

  const config = await getStoreConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: Request) {
  const { ctx, error } = await requireAdminApi("settings.write", { req });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    nonAfricaMarkupEnabled?: boolean;
    nonAfricaMarkupUsd?: number;
    whatsappCheckoutEnabled?: boolean;
    whatsappCheckoutNumbers?: WhatsAppCheckoutNumbers;
    maintenanceMode?: boolean;
    guestHiddenPriceCatalogs?: ProductType[];
    pdpSponsoredAd?: unknown;
  };

  const markupUsd = Number(body.nonAfricaMarkupUsd);
  if (body.nonAfricaMarkupUsd !== undefined && (!Number.isFinite(markupUsd) || markupUsd < 0)) {
    return NextResponse.json(
      { error: "Markup must be a non-negative number" },
      { status: 400 }
    );
  }

  if (
    body.whatsappCheckoutNumbers !== undefined &&
    (typeof body.whatsappCheckoutNumbers !== "object" ||
      body.whatsappCheckoutNumbers === null ||
      Array.isArray(body.whatsappCheckoutNumbers))
  ) {
    return NextResponse.json(
      { error: "WhatsApp numbers must be an object of country code → phone" },
      { status: 400 }
    );
  }

  if (
    body.guestHiddenPriceCatalogs !== undefined &&
    !Array.isArray(body.guestHiddenPriceCatalogs)
  ) {
    return NextResponse.json(
      { error: "Guest hidden price catalogs must be an array" },
      { status: 400 }
    );
  }

  let pdpSponsoredAd;
  if (body.pdpSponsoredAd !== undefined) {
    pdpSponsoredAd = parsePdpSponsoredAd(body.pdpSponsoredAd);
    const adError = validatePdpSponsoredAd(pdpSponsoredAd);
    if (adError) {
      return NextResponse.json({ error: adError }, { status: 400 });
    }
  }

  const config = await upsertStoreConfig({
    nonAfricaMarkupEnabled: body.nonAfricaMarkupEnabled,
    nonAfricaMarkupUsd: body.nonAfricaMarkupUsd,
    whatsappCheckoutEnabled: body.whatsappCheckoutEnabled,
    whatsappCheckoutNumbers: body.whatsappCheckoutNumbers,
    maintenanceMode: body.maintenanceMode,
    guestHiddenPriceCatalogs:
      body.guestHiddenPriceCatalogs !== undefined
        ? parseGuestHiddenPriceCatalogs(body.guestHiddenPriceCatalogs)
        : undefined,
    pdpSponsoredAd,
  });

  await writeAuditLog({
    actorId: ctx.userId,
    action: "settings.update",
    entityType: "StoreConfig",
    entityId: "default",
    summary: "Updated store settings",
    req,
    metadata: {
      nonAfricaMarkupEnabled: config.nonAfricaMarkupEnabled,
      nonAfricaMarkupUsd: config.nonAfricaMarkupUsd,
      whatsappCheckoutEnabled: config.whatsappCheckoutEnabled,
      maintenanceMode: config.maintenanceMode,
      guestHiddenPriceCatalogs: config.guestHiddenPriceCatalogs,
      pdpSponsoredAdEnabled: config.pdpSponsoredAd.enabled,
    },
  });

  if (
    body.maintenanceMode !== undefined ||
    body.guestHiddenPriceCatalogs !== undefined ||
    body.pdpSponsoredAd !== undefined
  ) {
    revalidatePath("/", "layout");
    revalidatePath("/maintenance");
    revalidatePath("/watches", "layout");
    revalidatePath("/fragrances", "layout");
  }

  return NextResponse.json(config);
}
