import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import {
  getStoreConfig,
  upsertStoreConfig,
  type WhatsAppCheckoutNumbers,
} from "@/lib/store-config";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const config = await getStoreConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = (await req.json()) as {
    nonAfricaMarkupEnabled?: boolean;
    nonAfricaMarkupUsd?: number;
    whatsappCheckoutEnabled?: boolean;
    whatsappCheckoutNumbers?: WhatsAppCheckoutNumbers;
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

  const config = await upsertStoreConfig({
    nonAfricaMarkupEnabled: body.nonAfricaMarkupEnabled,
    nonAfricaMarkupUsd: body.nonAfricaMarkupUsd,
    whatsappCheckoutEnabled: body.whatsappCheckoutEnabled,
    whatsappCheckoutNumbers: body.whatsappCheckoutNumbers,
  });

  return NextResponse.json(config);
}
