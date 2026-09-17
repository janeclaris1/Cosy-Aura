import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  aramexShippingLabel,
  resolveAramexRateForCheckout,
} from "@/lib/shipping";
import { shippingUsdToGhs } from "@/lib/fx";
import { checkoutBaseUrl } from "@/lib/checkout-url";
import { parseDeliveryDate } from "@/lib/delivery-dates";
import {
  assertGuestCanCheckoutItems,
  cartLinesTotal,
  getCheckoutMemberContext,
  priceCartLines,
} from "@/lib/checkout-pricing";
import { fetchRatesFromGhs, rateFromGhs } from "@/lib/fx";
import {
  assertCheckoutGateway,
  logCheckoutCountryHintMismatch,
  resolveCheckoutCountry,
  resolveServerCountry,
} from "@/lib/geo-server";
import { linkCheckoutAbandonmentToOrder } from "@/lib/checkout-abandonment";

function toAbsoluteImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!base || base.includes("localhost")) return null;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      items,
      deliveryDate: deliveryDateRaw,
      shopperCountry,
      shippingRateId,
      shippingPriceUsd,
      email,
      name,
      phone,
      address,
      city,
      postcode,
    } = body;
    const deliveryDate = parseDeliveryDate(deliveryDateRaw);

    if (!items?.length) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }
    if (!deliveryDate) {
      return NextResponse.json(
        { error: "Please select a delivery date (Monday to Saturday)" },
        { status: 400 }
      );
    }

    const customerEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (
      !String(name || "").trim() ||
      !String(address || "").trim() ||
      !String(city || "").trim() ||
      !String(postcode || "").trim()
    ) {
      return NextResponse.json(
        { error: "Name, address, city, and postal code are required" },
        { status: 400 }
      );
    }
    if (!String(shippingRateId || "").trim()) {
      return NextResponse.json(
        { error: "Select an Aramex shipping option" },
        { status: 400 }
      );
    }

    const ipHint = await resolveServerCountry(req);
    const checkoutCountry = resolveCheckoutCountry(shopperCountry, ipHint);
    const gateway = assertCheckoutGateway(checkoutCountry, "stripe");
    if (!gateway.ok) {
      return NextResponse.json({ error: gateway.error }, { status: gateway.status });
    }
    logCheckoutCountryHintMismatch(gateway.country, ipHint, "stripe");
    const resolvedShopperCountry = gateway.country;

    let aramexRate;
    try {
      aramexRate = await resolveAramexRateForCheckout({
        rateId: String(shippingRateId),
        to: {
          name: String(name).trim(),
          street1: String(address).trim(),
          city: String(city).trim(),
          zip: String(postcode).trim(),
          country: resolvedShopperCountry,
          phone: String(phone || "").trim(),
          email: customerEmail,
        },
        quotedPriceUsd:
          shippingPriceUsd != null ? Number(shippingPriceUsd) : undefined,
      });
    } catch (rateErr) {
      return NextResponse.json(
        {
          error:
            rateErr instanceof Error
              ? rateErr.message
              : "Could not confirm Aramex shipping rate",
        },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_")) {
      return NextResponse.json(
        {
          error:
            "Stripe is misconfigured. Set STRIPE_SECRET_KEY to your secret key (sk_...).",
        },
        { status: 503 }
      );
    }

    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const member = await getCheckoutMemberContext();
    try {
      await assertGuestCanCheckoutItems(items, member.userId);
    } catch (err) {
      if (err instanceof Error && err.message === "SIGN_IN_REQUIRED_FOR_PRICING") {
        return NextResponse.json(
          { error: "Sign in to your account to purchase these items." },
          { status: 401 }
        );
      }
      throw err;
    }
    const [pricedItems, fx] = await Promise.all([
      priceCartLines(items, resolvedShopperCountry, {
        applyMemberDiscount: member.applyMemberDiscount,
      }),
      fetchRatesFromGhs(),
    ]);
    const itemsTotal = cartLinesTotal(pricedItems);
    const shippingCostGhs = shippingUsdToGhs(aramexRate.price, fx.rates);
    const orderTotalGhs = itemsTotal + shippingCostGhs;
    // US Stripe accounts cannot charge GHS — convert catalog (GHS) → USD for Checkout.
    const usdPerGhs = rateFromGhs(fx.rates, "USD");

    // Provisional order - email/shipping filled from Stripe session on payment
    // Order totals stay in GHS (catalog currency); Stripe charges the USD equivalent.
    const { orderLinesWithUnitCost } = await import("@/lib/cogs");
    const orderItemRows = await orderLinesWithUnitCost(
      pricedItems.map(
        (item: {
          fragranceId: string;
          price: number;
          quantity: number;
          bottleSize?: number;
        }) => ({
          fragranceId: item.fragranceId,
          price: item.price,
          quantity: item.quantity,
          bottleSize: item.bottleSize ?? 50,
        })
      )
    );

    const order = await prisma.order.create({
      data: {
        email: customerEmail,
        ...(member.userId ? { user: { connect: { id: member.userId } } } : {}),
        total: orderTotalGhs,
        shippingMethod: aramexShippingLabel(aramexRate),
        shippingCost: shippingCostGhs,
        carrier: "Aramex",
        shippingName: String(name).trim(),
        shippingPhone: String(phone || "").trim() || null,
        shippingAddress: String(address).trim(),
        shippingCity: String(city).trim(),
        shippingPostcode: String(postcode).trim(),
        shippingCountry: resolvedShopperCountry,
        deliveryDate,
        items: { create: orderItemRows },
      },
    });

    void linkCheckoutAbandonmentToOrder(customerEmail, order.id);

    const lineItems = await Promise.all(
      pricedItems.map(
        async (item: {
          fragranceId: string;
          quantity: number;
          price: number;
          bottleSize?: number;
          model?: string;
        }) => {
          const fragrance = await prisma.fragrance.findUnique({
            where: { id: item.fragranceId },
            include: { brand: true, images: true },
          });
          const imageUrl = toAbsoluteImageUrl(fragrance?.images[0]?.url);
          const sampleLabel =
            item.bottleSize === 3 || item.model?.toLowerCase().includes("sample")
              ? " · 3ml sample"
              : item.bottleSize
                ? ` · ${item.bottleSize}ml`
                : "";
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: fragrance
                  ? `${fragrance.brand.name} ${fragrance.model}${sampleLabel}`
                  : item.model || "Fragrance",
                description: fragrance?.reference
                  ? `Ref. ${fragrance.reference}`
                  : undefined,
                ...(imageUrl ? { images: [imageUrl] } : {}),
              },
              unit_amount: Math.max(1, Math.round(item.price * usdPerGhs * 100)),
            },
            quantity: item.quantity,
          };
        }
      )
    );

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: aramexShippingLabel(aramexRate),
          description: "International delivery via Aramex from Accra, Ghana",
        },
        unit_amount: Math.max(1, Math.round(aramexRate.price * 100)),
      },
      quantity: 1,
    });

    const baseUrl = checkoutBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: lineItems,
      customer_email: customerEmail,
      consent_collection: {
        terms_of_service: "required",
      },
      custom_text: {
        terms_of_service_acceptance: {
          message:
            "By placing this order, you agree to our Terms and Conditions, including shipping and returns terms.",
        },
      },
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      return_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        orderId: order.id,
        deliveryDate: deliveryDate.toISOString().slice(0, 10),
        usdPerGhs: String(usdPerGhs),
        shippingRateId: aramexRate.id,
        aramexService: aramexRate.service,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeSessionId: session.id,
        paymentProvider: "stripe",
        ...(session.amount_total != null
          ? {
              chargeAmount: session.amount_total / 100,
              chargeCurrency: (session.currency || "usd").toUpperCase(),
            }
          : {}),
      },
    });

    if (!session.client_secret) {
      return NextResponse.json(
        { error: "Stripe did not return a client secret for embedded checkout" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Checkout failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
