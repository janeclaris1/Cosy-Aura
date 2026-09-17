import { hookOrderSalesJournal } from "./accounting-order-hook";
import { prisma } from "./prisma";
import { ensureCustomerReceiptWhatsApp, notifyOrderPaid } from "./notifications";
import { verifyPaystackTransaction } from "./paystack";
import { dispatchGhanaForOrder } from "./dispatch-ghana-delivery";
import { paymentProviderWhere, rejectWrongPaymentProvider } from "./fulfill-guards";
import { verifyPaystackPaidAmount } from "./fulfill-amount";
import { markCheckoutAbandonmentsConverted } from "./checkout-abandonment";

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
  whatsappOk?: boolean;
  customerWhatsAppOk?: boolean;
  whatsappError?: string;
}> {
  const freeCheckoutOrder = await prisma.order.findFirst({
    where: { paystackReference: reference, stripePaymentId: "free-checkout" },
  });

  if (freeCheckoutOrder) {
    const providerError = rejectWrongPaymentProvider(freeCheckoutOrder, "paystack");
    if (providerError) {
      return { ok: false, reason: providerError, orderId: freeCheckoutOrder.id };
    }

    const previousStatus = freeCheckoutOrder.status;
    let isNewlyPaid = freeCheckoutOrder.status === "PENDING";

    if (isNewlyPaid) {
      const transitioned = await prisma.order.updateMany({
        where: {
          id: freeCheckoutOrder.id,
          status: "PENDING",
          ...paymentProviderWhere("paystack"),
        },
        data: { status: "PAID", paymentProvider: "paystack" },
      });
      isNewlyPaid = transitioned.count > 0;
    }

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: freeCheckoutOrder.id },
    });

    if (isNewlyPaid) {
      hookOrderSalesJournal(order.id, { previousStatus });
      void markCheckoutAbandonmentsConverted(order.email, order.id);
      if (order.shippingCountry === "GH" && (order.deliveryProvider || order.dawuroboPayer)) {
        void dispatchGhanaForOrder(order.id).then((result) => {
          if (!result.ok) {
            console.error("[fulfill-paystack] ghana dispatch", order.id, result.reason);
          }
        });
      }
    }

    return finalizePaidOrderNotifications(order, !isNewlyPaid);
  }

  const verified = await verifyPaystackTransaction(reference);
  const txn = verified.data;
  if (!verified.status || !txn || txn.status !== "success") {
    return { ok: false, reason: verified.message || "Paystack payment not successful" };
  }

  const metadataOrderId = String(txn.metadata?.orderId || "").trim();
  const order =
    (await prisma.order.findFirst({
      where: {
        OR: [
          { paystackReference: txn.reference },
          ...(metadataOrderId
            ? [{ id: metadataOrderId, paymentProvider: "paystack" as const }]
            : []),
        ],
      },
    })) || null;

  if (!order) {
    return { ok: false, reason: "Order not found", orderId: txn.metadata?.orderId };
  }

  const providerError = rejectWrongPaymentProvider(order, "paystack");
  if (providerError) {
    return { ok: false, reason: providerError, orderId: order.id };
  }

  const orderWithItems = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: { select: { price: true, quantity: true } } },
  });
  if (!orderWithItems) {
    return { ok: false, reason: "Order not found", orderId: order.id };
  }

  const amountCheck = await verifyPaystackPaidAmount(
    orderWithItems,
    txn.amount,
    txn.currency
  );
  if (!amountCheck.ok) {
    console.error("[fulfill-paystack] amount verification failed", order.id, amountCheck.reason);
    return { ok: false, reason: amountCheck.reason, orderId: order.id };
  }

  const email = txn.customer?.email || order.email;
  const previousStatus = order.status;
  let isNewlyPaid = order.status === "PENDING";

  const syncData = {
    email: email || order.email,
    paystackReference: txn.reference,
    stripePaymentId: String(txn.id),
    shippingPhone: txn.customer?.phone || order.shippingPhone,
  };

  if (isNewlyPaid) {
    const transitioned = await prisma.order.updateMany({
      where: {
        id: order.id,
        status: "PENDING",
        ...paymentProviderWhere("paystack"),
      },
      data: {
        status: "PAID",
        paymentProvider: "paystack",
        ...syncData,
      },
    });

    if (transitioned.count === 0) {
      const refetched = await prisma.order.findUnique({ where: { id: order.id } });
      if (!refetched) {
        return { ok: false, reason: "Order not found", orderId: order.id };
      }
      const retryError = rejectWrongPaymentProvider(refetched, "paystack");
      if (retryError) {
        return { ok: false, reason: retryError, orderId: order.id };
      }
      isNewlyPaid = false;
    } else {
      hookOrderSalesJournal(order.id, { previousStatus });
      void markCheckoutAbandonmentsConverted(email || order.email, order.id);
    }
  }

  if (!isNewlyPaid) {
    await prisma.order.update({
      where: { id: order.id },
      data: syncData,
    });
  }

  if (
    isNewlyPaid &&
    order.shippingCountry === "GH" &&
    (order.deliveryProvider || order.dawuroboPayer)
  ) {
    void dispatchGhanaForOrder(order.id).then((result) => {
      if (!result.ok) {
        console.error("[fulfill-paystack] ghana dispatch", order.id, result.reason);
      }
    });
  }

  const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  return finalizePaidOrderNotifications(updated, !isNewlyPaid);
}

async function finalizePaidOrderNotifications(
  order: { id: string; email: string; confirmationEmailedAt: Date | null; status: string },
  alreadyPaid = false
): Promise<{
  ok: boolean;
  reason?: string;
  orderId?: string;
  emailSent?: boolean;
  emailError?: string;
  whatsappOk?: boolean;
  customerWhatsAppOk?: boolean;
  whatsappError?: string;
}> {
  if (order.confirmationEmailedAt) {
    const whatsappResult = await ensureCustomerReceiptWhatsApp(order.id);
    return {
      ok: true,
      reason: "Already fulfilled",
      orderId: order.id,
      emailSent: true,
      whatsappOk: whatsappResult.ok,
      customerWhatsAppOk: whatsappResult.ok,
      whatsappError:
        "error" in whatsappResult ? whatsappResult.error : undefined,
    };
  }

  if (!order.email || !order.email.includes("@") || order.email.includes("pending@checkout")) {
    const whatsappResult = await notifyOrderPaid(order.id);
    return {
      ok: true,
      reason: "Paid but email failed",
      orderId: order.id,
      emailSent: false,
      emailError: "No customer email on Paystack transaction",
      whatsappOk: whatsappResult.whatsappOk,
      customerWhatsAppOk: whatsappResult.customerWhatsAppOk,
      whatsappError: whatsappResult.customerWhatsAppError,
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
      whatsappOk: emailResult.whatsappOk,
      customerWhatsAppOk: emailResult.customerWhatsAppOk,
      whatsappError: emailResult.customerWhatsAppError,
    };
  }

  return {
    ok: true,
    reason: alreadyPaid ? "Already fulfilled" : undefined,
    orderId: order.id,
    emailSent: true,
    whatsappOk: emailResult.whatsappOk,
    customerWhatsAppOk: emailResult.customerWhatsAppOk,
  };
}
