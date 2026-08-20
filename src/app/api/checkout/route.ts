import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  getActiveShippingMethods,
  toStripeShippingOptions,
} from "@/lib/shipping-methods";
import { COUNTRIES } from "@/lib/countries";
import { checkoutBaseUrl } from "@/lib/checkout-url";
import {
  formatDeliveryDateLabel,
  parseDeliveryDate,
} from "@/lib/delivery-dates";
import { cartLinesTotal, getCheckoutMemberContext, priceCartLines } from "@/lib/checkout-pricing";
import { fetchRatesFromGhs, rateFromGhs } from "@/lib/fx";

function toAbsoluteImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!base || base.includes("localhost")) return null;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

/**
 * Stripe Checkout shipping_address_collection only accepts this set.
 * (Excludes sanctions / unsupported codes like CU, IR, KP, SY, etc.)
 */
const STRIPE_SHIPPING_COUNTRY_CODES = new Set([
  "AC","AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS",
  "BT","BV","BW","BY","BZ","CA","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO",
  "CR","CV","CW","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER",
  "ES","ET","FI","FJ","FK","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL",
  "GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HN","HR","HT","HU","ID",
  "IE","IL","IM","IN","IO","IQ","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI",
  "KM","KN","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV",
  "LY","MA","MC","MD","ME","MF","MG","MK","ML","MM","MN","MO","MQ","MR","MS","MT",
  "MU","MV","MW","MX","MY","MZ","NA","NC","NE","NG","NI","NL","NO","NP","NR","NU",
  "NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PY","QA",
  "RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL",
  "SM","SN","SO","SR","SS","ST","SV","SX","SZ","TA","TC","TD","TF","TG","TH","TJ",
  "TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","US","UY","UZ","VA",
  "VC","VE","VG","VN","VU","WF","WS","XK","YE","YT","ZA","ZM","ZW","ZZ",
]);

function allowedShippingCountries(): string[] {
  return COUNTRIES.map((c) => c.code).filter((code) =>
    STRIPE_SHIPPING_COUNTRY_CODES.has(code)
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, deliveryDate: deliveryDateRaw, shopperCountry } = body;
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
    const [pricedItems, fx] = await Promise.all([
      priceCartLines(items, shopperCountry ?? null, {
        applyMemberDiscount: member.applyMemberDiscount,
      }),
      fetchRatesFromGhs(),
    ]);
    const itemsTotal = cartLinesTotal(pricedItems);
    // US Stripe accounts cannot charge GHS — convert catalog (GHS) → USD for Checkout.
    const usdPerGhs = rateFromGhs(fx.rates, "USD");

    // Provisional order - email/shipping filled from Stripe session on payment
    // Order totals stay in GHS (catalog currency); Stripe charges the USD equivalent.
    const order = await prisma.order.create({
      data: {
        email: "pending@checkout.cosyaura.com",
        ...(member.userId ? { user: { connect: { id: member.userId } } } : {}),
        total: itemsTotal,
        shippingMethod: null,
        shippingCost: 0,
        deliveryDate,
        items: {
          create: pricedItems.map(
            (item: { fragranceId: string; price: number; quantity: number }) => ({
              fragranceId: item.fragranceId,
              price: item.price,
              quantity: item.quantity,
            })
          ),
        },
      },
    });

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

    const baseUrl = checkoutBaseUrl(req);

    const shippingMethods = await getActiveShippingMethods();

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: lineItems,
      consent_collection: {
        terms_of_service: "required",
      },
      custom_text: {
        shipping_address: {
          message: `We deliver Monday to Saturday. Requested delivery: ${formatDeliveryDateLabel(
            deliveryDate.toISOString().slice(0, 10)
          )}. Add your WhatsApp number for a payment receipt.`,
        },
        terms_of_service_acceptance: {
          message:
            "By placing this order, you agree to our Terms and Conditions, including shipping and returns terms.",
        },
      },
      // Full Checkout form: email, shipping address, shipping method, payment
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: allowedShippingCountries() as never[],
      },
      shipping_options: toStripeShippingOptions(shippingMethods),
      return_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        orderId: order.id,
        deliveryDate: deliveryDate.toISOString().slice(0, 10),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id, paymentProvider: "stripe" },
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
