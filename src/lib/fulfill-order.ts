import type Stripe from "stripe";
import { foreignToGhs, orderItemsSubtotalGhs } from "./order-money";
import { prisma } from "./prisma";
import { ensureCustomerReceiptWhatsApp, notifyOrderPaid } from "./notifications";
import { parseDeliveryDate } from "./delivery-dates";

const PLACEHOLDER_EMAIL = "pending@checkout.cosyaura.com";

function sessionCustomerEmail(session: Stripe.Checkout.Session): string | null {
  return (
    session.customer_details?.email ||
    session.customer_email ||
    null
  );
}

function shippingFromSession(session: Stripe.Checkout.Session) {
  return (
    session.shipping_details ||
    (
      session as {
        collected_information?: {
          shipping_details?: Stripe.Checkout.Session.ShippingDetails | null;
        };
      }
    ).collected_information?.shipping_details ||
    null
  );
}

/**
 * Marks a PENDING order as PAID from a completed Stripe Checkout Session
 * and sends confirmation emails. Safe to call more than once.
 */
export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<{
  ok: boolean;
  reason?: string;
  orderId?: string;
  emailSent?: boolean;
  emailError?: string;
}> {
  if (session.status !== "complete" && session.payment_status !== "paid") {
    return { ok: false, reason: "Session not paid" };
  }

  const orderId = session.metadata?.orderId;
  if (!orderId) {
    return { ok: false, reason: "Missing orderId metadata" };
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { price: true, quantity: true } } },
  });
  if (!existing) {
    return { ok: false, reason: "Order not found", orderId };
  }

  const alreadyPaid = existing.status !== "PENDING";
  const shippingDetails = shippingFromSession(session);

  const chargeCurrency = (session.currency || "usd").toUpperCase();
  const chargeAmount =
    session.amount_total != null ? session.amount_total / 100 : null;
  const usdPerGhs = Number(session.metadata?.usdPerGhs);

  let shippingCostGhs = existing.shippingCost;
  if (session.shipping_cost?.amount_total != null) {
    const shippingCharged = session.shipping_cost.amount_total / 100;
    shippingCostGhs =
      chargeCurrency === "USD" && usdPerGhs > 0
        ? foreignToGhs(shippingCharged, usdPerGhs)
        : shippingCharged;
  }

  const totalGhs =
    Math.round(
      (orderItemsSubtotalGhs(existing.items) + shippingCostGhs) * 100
    ) / 100;

  const shippingRate = session.shipping_cost?.shipping_rate;
  const shippingMethod =
    shippingRate && typeof shippingRate === "object"
      ? shippingRate.display_name || existing.shippingMethod
      : existing.shippingMethod;

  const emailFromSession = sessionCustomerEmail(session);
  const email =
    emailFromSession ||
    (existing.email !== PLACEHOLDER_EMAIL ? existing.email : null);

  const deliveryDate =
    parseDeliveryDate(session.metadata?.deliveryDate) || existing.deliveryDate;

  // Always sync Stripe customer/shipping onto the order - including when an
  // admin marked PAID early and left the placeholder checkout email.
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: alreadyPaid ? existing.status : "PAID",
      ...(email ? { email } : {}),
      total: totalGhs,
      chargeAmount,
      chargeCurrency: chargeAmount != null ? chargeCurrency : null,
      shippingCost: shippingCostGhs,
      shippingMethod: shippingMethod || existing.shippingMethod || "Stripe shipping",
      stripeSessionId: session.id,
      paymentProvider: "stripe",
      stripePaymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? existing.stripePaymentId,
      shippingName:
        shippingDetails?.name ||
        session.customer_details?.name ||
        existing.shippingName,
      shippingAddress:
        shippingDetails?.address?.line1 || existing.shippingAddress,
      shippingCity: shippingDetails?.address?.city || existing.shippingCity,
      shippingPostcode:
        shippingDetails?.address?.postal_code || existing.shippingPostcode,
      shippingCountry:
        shippingDetails?.address?.country || existing.shippingCountry,
      shippingPhone:
        session.customer_details?.phone || existing.shippingPhone,
      ...(deliveryDate ? { deliveryDate } : {}),
    },
  });

  if (existing.confirmationEmailedAt) {
    await ensureCustomerReceiptWhatsApp(orderId);
    return {
      ok: true,
      reason: "Already fulfilled",
      orderId,
      emailSent: true,
    };
  }

  if (!email || email === PLACEHOLDER_EMAIL) {
    console.error("[fulfill] no customer email on session/order", orderId);
    return {
      ok: true,
      reason: "Paid but email failed",
      orderId,
      emailSent: false,
      emailError: "No customer email on Stripe session",
    };
  }

  const emailResult = await notifyOrderPaid(orderId);
  if (emailResult.customerOk) {
    await prisma.order.update({
      where: { id: orderId },
      data: { confirmationEmailedAt: new Date() },
    });
  }

  if (!emailResult.customerOk) {
    console.error("[fulfill] customer email failed:", emailResult.error);
    return {
      ok: true,
      reason: "Paid but email failed",
      orderId,
      emailSent: false,
      emailError: emailResult.error,
    };
  }

  if (!emailResult.adminOk) {
    console.error("[fulfill] admin email failed:", emailResult.error);
    return {
      ok: true,
      reason: "Paid but admin email failed",
      orderId,
      emailSent: true,
      emailError: emailResult.error,
    };
  }

  return {
    ok: true,
    reason: alreadyPaid ? "Already fulfilled" : undefined,
    orderId,
    emailSent: true,
  };
}
