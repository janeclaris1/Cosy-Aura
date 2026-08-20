import { prisma } from "./prisma";
import { ensureCustomerReceiptWhatsApp, notifyOrderPaid } from "./notifications";
import { verifyPaystackTransaction } from "./paystack";
import { dispatchGhanaForOrder } from "./dispatch-ghana-delivery";

/**
 * Marks a PENDING Paystack order as PAID after a successful charge.
 * Safe to call more than once.
 */
export async function fulfillPaystackReference(reference: string): Promise<{
  ok: boolean;
  reason?: string;
  orderId?: string;
  emailSent?: boolean;
  emailError?: string;
}> {
  const verified = await verifyPaystackTransaction(reference);
  const txn = verified.data;
  if (!verified.status || !txn || txn.status !== "success") {
    return { ok: false, reason: verified.message || "Paystack payment not successful" };
  }

  const order =
    (await prisma.order.findFirst({
      where: {
        OR: [{ paystackReference: txn.reference }, { id: String(txn.metadata?.orderId || "") }],
      },
    })) || null;

  if (!order) {
    return { ok: false, reason: "Order not found", orderId: txn.metadata?.orderId };
  }

  const email = txn.customer?.email || order.email;
  const alreadyPaid = order.status !== "PENDING";

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: alreadyPaid ? order.status : "PAID",
      email: email || order.email,
      paymentProvider: "paystack",
      paystackReference: txn.reference,
      stripePaymentId: String(txn.id),
      shippingPhone: txn.customer?.phone || order.shippingPhone,
    },
  });

  // Ghana hybrid dispatch (Dawurobo Accra / ShaQ nationwide)
  if (order.shippingCountry === "GH" && (order.deliveryProvider || order.dawuroboPayer)) {
    void dispatchGhanaForOrder(order.id).then((result) => {
      if (!result.ok) {
        console.error("[fulfill-paystack] ghana dispatch", order.id, result.reason);
      }
    });
  }

  if (order.confirmationEmailedAt) {
    await ensureCustomerReceiptWhatsApp(order.id);
    return {
      ok: true,
      reason: "Already fulfilled",
      orderId: order.id,
      emailSent: true,
    };
  }

  if (!email || !email.includes("@") || email.includes("pending@checkout")) {
    return {
      ok: true,
      reason: "Paid but email failed",
      orderId: order.id,
      emailSent: false,
      emailError: "No customer email on Paystack transaction",
    };
  }

  const emailResult = await notifyOrderPaid(order.id);
  if (emailResult.customerOk) {
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationEmailedAt: new Date() },
    });
  }

  if (!emailResult.customerOk) {
    return {
      ok: true,
      reason: "Paid but email failed",
      orderId: order.id,
      emailSent: false,
      emailError: emailResult.error,
    };
  }

  return {
    ok: true,
    reason: alreadyPaid ? "Already fulfilled" : undefined,
    orderId: order.id,
    emailSent: true,
  };
}
