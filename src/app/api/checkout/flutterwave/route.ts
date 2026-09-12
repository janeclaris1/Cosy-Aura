import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkoutBaseUrl } from "@/lib/checkout-url";
import { getActiveShippingMethods } from "@/lib/shipping-methods";
import {
  cemacCountryName,
  flutterwaveCharge,
  flutterwaveSecret,
  initializeFlutterwavePayment,
  isCemacCountry,
} from "@/lib/flutterwave";
import { parseDeliveryDate } from "@/lib/delivery-dates";
import { cartLinesTotal, getCheckoutMemberContext, priceCartLines } from "@/lib/checkout-pricing";
import { fetchRatesFromGhs, shippingUsdToGhs } from "@/lib/fx";
import { resolveFulfillmentBranchId } from "@/lib/branches";
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
    };

    if (!items?.length) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }
    if (!isCemacCountry(country)) {
      return NextResponse.json(
        { error: "Flutterwave checkout is only available for CEMAC countries" },
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

    if (!flutterwaveSecret()) {
      return NextResponse.json(
        { error: "Flutterwave is not configured. Set FLW_SECRET_KEY." },
        { status: 503 }
      );
    }

    const methods = await getActiveShippingMethods();
    const shipping =
      methods.find((method) => method.id === shippingMethodId) || methods[0];
    if (!shipping) {
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
    const shippingGhs = shippingUsdToGhs(shipping.price, fx.rates);
    const total = itemsTotal + shippingGhs;
    const charge = flutterwaveCharge(total, fx.rates);

    const fulfillmentBranchId = await resolveFulfillmentBranchId(country);

    const { orderLinesWithUnitCost } = await import("@/lib/cogs");
    const orderItemRows = await orderLinesWithUnitCost(
      pricedItems.map((item) => ({
        fragranceId: item.fragranceId,
        price: item.price,
        quantity: item.quantity,
        bottleSize: item.bottleSize ?? 50,
      }))
    );

    const order = await prisma.order.create({
      data: {
        email: customerEmail,
        ...(member.userId ? { user: { connect: { id: member.userId } } } : {}),
        total,
        shippingMethod: `${shipping.name} · ${shipping.eta}`,
        shippingCost: shippingGhs,
        shippingName: String(name).trim(),
        shippingPhone: String(phone || "").trim() || null,
        shippingAddress: String(address).trim(),
        shippingCity: String(city).trim(),
        shippingPostcode: String(postcode || "").trim() || null,
        shippingCountry: country,
        deliveryDate,
        paymentProvider: "flutterwave",
        ...(fulfillmentBranchId
          ? { fulfillmentBranch: { connect: { id: fulfillmentBranchId } } }
          : {}),
        items: { create: orderItemRows },
      },
    });

    const txRef = `flw_${order.id}`;
    const baseUrl = checkoutBaseUrl(req);
    const shortId = order.id.slice(0, 8).toUpperCase();

    const init = await initializeFlutterwavePayment({
      txRef,
      amount: charge.amount,
      currency: charge.currency,
      redirectUrl: `${baseUrl}/checkout/success`,
      email: customerEmail,
      name: String(name).trim(),
      phone: String(phone || "").trim(),
      title: "COSY AURA",
      description: `Order ${shortId} - ${cemacCountryName(country)}`,
      meta: {
        orderId: order.id,
        country,
        deliveryDate: deliveryDate.toISOString().slice(0, 10),
      },
    });

    if (init.status !== "success" || !init.data?.link) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json(
        { error: init.message || "Could not start Flutterwave checkout" },
        { status: 502 }
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { flutterwaveTxRef: txRef },
    });

    return NextResponse.json({
      authorizationUrl: init.data.link,
      reference: txRef,
      orderId: order.id,
      currency: charge.currency,
    });
  } catch (error) {
    console.error("[checkout/flutterwave]", error);
    const message =
      error instanceof Error ? error.message : "Flutterwave checkout failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
