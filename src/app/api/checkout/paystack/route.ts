import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkoutBaseUrl } from "@/lib/checkout-url";
import { getActiveShippingMethods } from "@/lib/shipping-methods";
import {
  initializePaystackTransaction,
  isPaystackCountry,
  paystackChannels,
  paystackCharge,
  paystackSecretForCountry,
  type PaystackCountry,
} from "@/lib/paystack";
import { formatDeliveryDateLabel, parseDeliveryDate } from "@/lib/delivery-dates";
import { cartLinesTotal, getCheckoutMemberContext, priceCartLines } from "@/lib/checkout-pricing";
import { fetchRatesFromGhs, shippingUsdToGhs } from "@/lib/fx";
import {
  applyGhanaFreeDelivery,
  estimateGhanaDelivery,
  ghanaDeliveryConfigured,
  qualifiesForGhanaFreeDelivery,
  resolveGhanaDeliveryProvider,
  type GhanaDeliveryProvider,
  type GhanaPaymentMode,
} from "@/lib/ghana-delivery";
import { shaqexpressConfigured } from "@/lib/shaqexpress";
import { resolveGhanaDeliveryLocation } from "@/lib/ghana-geo";
import { earliestDeliveryIso } from "@/lib/delivery-dates";
import { resolveFulfillmentBranchId, getCountryCommerceConfig } from "@/lib/branches";
import { assertCartSizeStockAvailable } from "@/lib/size-stock-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      items,
      country,
      email,
      name,
      phone,
      address,
      city,
      postcode,
      shippingMethodId,
      deliveryDate: deliveryDateRaw,
      deliveryPayer: deliveryPayerRaw,
      deliveryLat,
      deliveryLng,
      destinationRegion,
      regionId,
      deliveryProvider: deliveryProviderRaw,
    } = body as {
      items?: Array<{
        fragranceId: string;
        quantity: number;
        price: number;
        bottleSize?: number;
        model?: string;
      }>;
      country?: string;
      email?: string;
      name?: string;
      phone?: string;
      address?: string;
      city?: string;
      postcode?: string;
      shippingMethodId?: string;
      deliveryDate?: string;
      deliveryPayer?: string;
      deliveryLat?: number;
      deliveryLng?: number;
      destinationRegion?: string;
      region?: string;
      regionId?: number;
      deliveryProvider?: string;
    };

    if (!items?.length) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }
    if (!isPaystackCountry(country)) {
      return NextResponse.json(
        { error: "Paystack checkout is only available for Ghana and Nigeria" },
        { status: 400 }
      );
    }

    try {
      await assertCartSizeStockAvailable(items, country);
    } catch (stockErr) {
      return NextResponse.json(
        {
          error:
            stockErr instanceof Error
              ? stockErr.message
              : "One or more items are out of stock",
        },
        { status: 400 }
      );
    }

    const customerEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!String(name || "").trim() || !String(address || "").trim() || !String(city || "").trim()) {
      return NextResponse.json(
        { error: "Name, address, and city are required" },
        { status: 400 }
      );
    }
    const deliveryDate = parseDeliveryDate(deliveryDateRaw);
    if (!deliveryDate) {
      return NextResponse.json(
        { error: "Please select a delivery date (Monday to Saturday)" },
        { status: 400 }
      );
    }

    // Ghana next-day only: must be the earliest allowed weekday
    if (country === "GH") {
      const nextDay = earliestDeliveryIso();
      const chosen = deliveryDate.toISOString().slice(0, 10);
      if (chosen !== nextDay) {
        return NextResponse.json(
          { error: `Ghana orders ship next day only (${nextDay}).` },
          { status: 400 }
        );
      }
    }

    const secret = paystackSecretForCountry(country);
    if (!secret) {
      return NextResponse.json(
        {
          error:
            "Paystack is not configured. Set PAYSTACK_SECRET_KEY (and PAYSTACK_SECRET_KEY_NG for Nigeria if you use a separate account).",
        },
        { status: 503 }
      );
    }

    const useGhanaCourier = country === "GH" && ghanaDeliveryConfigured();
    let deliveryProvider: GhanaDeliveryProvider | "pickup" | null = null;
    let deliveryPayer: GhanaPaymentMode | null = null;
    let courierFeeGhs = 0;
    let resolvedLat: number | null = null;
    let resolvedLng: number | null = null;
    let shippingRegion: string | null = null;
    let shippingRegionId: number | null = null;

    if (country !== "GH") {
      const payerRaw = String(deliveryPayerRaw || "").toLowerCase();
      if (payerRaw === "recipient" || payerRaw === "cod") {
        return NextResponse.json(
          {
            error:
              "Pay Order Now and Cash on delivery are only available for Ghana checkout.",
          },
          { status: 400 }
        );
      }
    }

    if (useGhanaCourier) {
      const preferred = String(deliveryProviderRaw || "")
        .trim()
        .toLowerCase();

      if (preferred === "pickup") {
        const commerce = await getCountryCommerceConfig("GH");
        if (!commerce?.pickupEnabled) {
          return NextResponse.json(
            { error: "Pickup is not available for this shop." },
            { status: 400 }
          );
        }
        deliveryProvider = "pickup";
        deliveryPayer = "partner";
        shippingRegion = String(destinationRegion || (body as { region?: string }).region || "").trim() || "Pickup";
      } else {
      shippingRegion = String(destinationRegion || (body as { region?: string }).region || "").trim();
      if (!shippingRegion) {
        return NextResponse.json({ error: "Select your Ghana region" }, { status: 400 });
      }

      deliveryProvider = resolveGhanaDeliveryProvider(
        shippingRegion,
        preferred === "dawurobo" || preferred === "shaqexpress" ? preferred : null
      );
      if (!deliveryProvider) {
        return NextResponse.json(
          { error: "Delivery is not available for this region yet." },
          { status: 400 }
        );
      }

      const commerce = await getCountryCommerceConfig("GH");
      if (deliveryProvider === "dawurobo" && !(commerce?.dawuroboEnabled ?? true)) {
        return NextResponse.json(
          { error: "Dawurobo is not available. Choose ShaQ Express." },
          { status: 400 }
        );
      }
      if (deliveryProvider === "shaqexpress" && !(commerce?.shaqexpressEnabled ?? true)) {
        return NextResponse.json(
          { error: "ShaQ Express is not available for checkout right now." },
          { status: 400 }
        );
      }

      if (preferred && preferred !== deliveryProvider) {
        return NextResponse.json(
          {
            error:
              preferred === "dawurobo"
                ? "Dawurobo only delivers in Greater Accra. Choose ShaQ Express or switch region."
                : "Selected delivery agency is not available for this region.",
          },
          { status: 400 }
        );
      }

      // ShaQ Express dispatch requires API creds; warn admin in logs but allow order.
      // Flat fee is always valid for billing — dispatch is handled manually without creds.
      if (deliveryProvider === "shaqexpress" && !shaqexpressConfigured()) {
        console.warn("[checkout/paystack] ShaQ Express order without API credentials — dispatch manually.");
      }

      if (regionId != null && Number.isFinite(Number(regionId))) {
        shippingRegionId = Number(regionId);
      }

      const payerRaw = String(deliveryPayerRaw || "recipient").toLowerCase();
      if (payerRaw === "partner") {
        // "Pay in full" charges products + delivery via Paystack — always allowed.
        // Dawurobo partner-payer wallet is separate; not required here.
        deliveryPayer = "partner";
      } else if (payerRaw === "cod") {
        if (!(commerce?.codEnabled ?? true)) {
          return NextResponse.json(
            { error: "Cash on delivery is not available for this shop." },
            { status: 400 }
          );
        }
        deliveryPayer = "cod";
      } else if (payerRaw === "recipient") {
        deliveryPayer = "recipient";
      } else {
        return NextResponse.json(
          { error: "Choose a payment option: pay now, cash on delivery, or pay products now." },
          { status: 400 }
        );
      }

      if (deliveryProvider === "dawurobo") {
        const location = resolveGhanaDeliveryLocation({
          city,
          address,
          lat: deliveryLat != null ? Number(deliveryLat) : null,
          lng: deliveryLng != null ? Number(deliveryLng) : null,
        });
        resolvedLat = location.coordinates.lat;
        resolvedLng = location.coordinates.lng;
      }

      // Delivery fee is prepaid for partner (pay in full) and COD
      if (deliveryPayer === "partner" || deliveryPayer === "cod") {
        const estimate = await estimateGhanaDelivery({
          region: shippingRegion,
          city: String(city).trim(),
          address: String(address || "").trim() || undefined,
          lat: resolvedLat,
          lng: resolvedLng,
          provider: deliveryProvider as GhanaDeliveryProvider,
        });
        courierFeeGhs = estimate.amountGhs;
      }
      } // end courier (non-pickup)
    }

    const methods = await getActiveShippingMethods();
    const shipping =
      methods.find((method) => method.id === shippingMethodId) || methods[0];
    if (!useGhanaCourier && !shipping) {
      return NextResponse.json({ error: "No shipping methods available" }, { status: 400 });
    }

    const member = await getCheckoutMemberContext();
    const [pricedItems, fx] = await Promise.all([
      priceCartLines(items, country ?? null, {
        applyMemberDiscount: member.applyMemberDiscount,
      }),
      fetchRatesFromGhs(),
    ]);
    const itemsTotal = cartLinesTotal(pricedItems);
    const freeDelivery =
      useGhanaCourier &&
      deliveryProvider !== "pickup" &&
      qualifiesForGhanaFreeDelivery(itemsTotal);
    const shippingGhs = useGhanaCourier
      ? applyGhanaFreeDelivery(courierFeeGhs, itemsTotal)
      : shippingUsdToGhs(shipping!.price, fx.rates);
    // Record full order value; Paystack charge may be delivery-only for COD
    const orderTotal = itemsTotal + shippingGhs;
    const chargeTotal =
      useGhanaCourier && deliveryPayer === "cod" ? shippingGhs : orderTotal;
    const charge =
      chargeTotal > 0
        ? paystackCharge(chargeTotal, country as PaystackCountry, fx.rates)
        : null;
    const dest = country as PaystackCountry;

    const providerLabel =
      deliveryProvider === "pickup"
        ? "Pickup"
        : deliveryProvider === "shaqexpress"
          ? "ShaQ Express"
          : deliveryProvider === "dawurobo"
            ? "Dawurobo"
            : null;

    const freeDeliverySuffix = freeDelivery ? " · Free delivery" : "";

    const shippingMethodLabel = useGhanaCourier
      ? deliveryProvider === "pickup"
        ? "Pickup at shop · paid in full"
        : deliveryPayer === "cod"
          ? `${providerLabel} · COD (delivery prepaid)${freeDeliverySuffix}`
          : deliveryPayer === "partner"
            ? `${providerLabel} · paid in full${freeDeliverySuffix}`
            : `${providerLabel} · pay rider${freeDeliverySuffix}`
      : `${shipping!.name} · ${shipping!.eta}`;

    const fulfillmentBranchId = await resolveFulfillmentBranchId(dest);

    const order = await prisma.order.create({
      data: {
        email: customerEmail,
        ...(member.userId ? { user: { connect: { id: member.userId } } } : {}),
        total: orderTotal,
        shippingMethod: shippingMethodLabel,
        shippingCost: shippingGhs,
        shippingName: String(name).trim(),
        shippingPhone: String(phone || "").trim() || null,
        shippingAddress: String(address).trim(),
        shippingCity: String(city).trim(),
        shippingPostcode: String(postcode || "").trim() || null,
        shippingCountry: dest,
        shippingRegion,
        shippingRegionId,
        deliveryProvider,
        deliveryDate,
        deliveryLat: resolvedLat,
        deliveryLng: resolvedLng,
        dawuroboPayer: deliveryPayer,
        paymentProvider: "paystack",
        ...(fulfillmentBranchId
          ? { fulfillmentBranch: { connect: { id: fulfillmentBranchId } } }
          : {}),
        items: {
          create: pricedItems.map((item) => ({
            fragranceId: item.fragranceId,
            price: item.price,
            quantity: item.quantity,
            bottleSize: item.bottleSize ?? 50,
          })),
        },
      },
    });

    const reference = `ca_${order.id}`;
    const baseUrl = checkoutBaseUrl(req);

    if (chargeTotal <= 0) {
      if (itemsTotal <= 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });
        return NextResponse.json(
          { error: "Checkout amount must be greater than zero." },
          { status: 400 }
        );
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paystackReference: reference,
          status: "PAID",
          stripePaymentId: "free-checkout",
        },
      });

      return NextResponse.json({
        authorizationUrl: `${baseUrl}/checkout/success?reference=${encodeURIComponent(reference)}`,
        reference,
        orderId: order.id,
        currency: "GHS",
      });
    }

    const init = await initializePaystackTransaction({
      secret,
      email: customerEmail,
      amount: charge!.amount,
      currency: charge!.currency,
      reference,
      callbackUrl: `${baseUrl}/checkout/success`,
      channels: paystackChannels(dest),
      metadata: {
        orderId: order.id,
        country: dest,
        paymentMode: deliveryPayer || "prepaid",
        codCollectGhs: deliveryPayer === "cod" ? itemsTotal : 0,
        custom_fields: [
          {
            display_name: "Order",
            variable_name: "order_id",
            value: order.id.slice(0, 8).toUpperCase(),
          },
          {
            display_name: "Ship to",
            variable_name: "ship_city",
            value: `${city}, ${dest}`,
          },
          {
            display_name: "Delivery date",
            variable_name: "delivery_date",
            value: formatDeliveryDateLabel(deliveryDate.toISOString().slice(0, 10)),
          },
          ...(deliveryPayer === "cod"
            ? [
                {
                  display_name: "COD collect",
                  variable_name: "cod_collect",
                  value: `GHS ${itemsTotal.toFixed(2)}`,
                },
              ]
            : []),
        ],
      },
    });

    if (!init.status || !init.data?.authorization_url) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json(
        { error: init.message || "Could not start Paystack checkout" },
        { status: 502 }
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paystackReference: init.data.reference || reference },
    });

    return NextResponse.json({
      authorizationUrl: init.data.authorization_url,
      reference: init.data.reference,
      orderId: order.id,
      currency: charge!.currency,
    });
  } catch (error) {
    console.error("[checkout/paystack]", error);
    const message =
      error instanceof Error ? error.message : "Paystack checkout failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
