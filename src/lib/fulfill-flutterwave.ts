import { hookOrderSalesJournal } from "./accounting-order-hook";
import { prisma } from "./prisma";
import { ensureCustomerReceiptWhatsApp, notifyOrderPaid } from "./notifications";
import { verifyFlutterwaveTransaction } from "./flutterwave";
import { paymentProviderWhere, rejectWrongPaymentProvider } from "./fulfill-guards";
import { verifyFlutterwavePaidAmount } from "./fulfill-amount";
import { markCheckoutAbandonmentsConverted } from "./checkout-abandonment";

export async function fulfillFlutterwavePayment(input: {
  txRef?: string;
  transactionId?: string;
}): Promise<{
  ok: boolean;
  reason?: string;
  orderId?: string;
  emailSent?: boolean;
  emailError?: string;
}> {
  const verified = await verifyFlutterwaveTransaction(input);
  const txn = verified.data;
  const paid =
    verified.status === "success" &&
    txn &&
    ["successful", "completed"].includes(String(txn.status).toLowerCase());

  if (!paid || !txn) {
    return {
      ok: false,
      reason: verified.message || "Flutterwave payment not successful",
    };
  }

  const metadataOrderId = String(txn.meta?.orderId || "").trim();
  const order =
    (await prisma.order.findFirst({
      where: {
        OR: [
          { flutterwaveTxRef: txn.tx_ref },
          ...(metadataOrderId
            ? [{ id: metadataOrderId, paymentProvider: "flutterwave" as const }]
            : []),
        ],
      },
    })) || null;

  if (!order) {
    return { ok: false, reason: "Order not found", orderId: txn.meta?.orderId };
  }

  const providerError = rejectWrongPaymentProvider(order, "flutterwave");
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

  const amountCheck = verifyFlutterwavePaidAmount(
    orderWithItems,
    Number(txn.amount),
    txn.currency
  );
  if (!amountCheck.ok) {
    console.error("[fulfill-flutterwave] amount verification failed", order.id, amountCheck.reason);
    return { ok: false, reason: amountCheck.reason, orderId: order.id };
  }

  const email = txn.customer?.email || order.email;
  const previousStatus = order.status;
  let isNewlyPaid = order.status === "PENDING";

  const syncData = {
    email: email || order.email,
    flutterwaveTxRef: txn.tx_ref,
    stripePaymentId: String(txn.id),
    shippingPhone:
      txn.customer?.phone_number ||
      txn.customer?.phonenumber ||
      order.shippingPhone,
  };

  if (isNewlyPaid) {
    const transitioned = await prisma.order.updateMany({
      where: {
        id: order.id,
        status: "PENDING",
        ...paymentProviderWhere("flutterwave"),
      },
      data: {
        status: "PAID",
        paymentProvider: "flutterwave",
        ...syncData,
      },
    });

    if (transitioned.count === 0) {
      const refetched = await prisma.order.findUnique({ where: { id: order.id } });
      if (!refetched) {
        return { ok: false, reason: "Order not found", orderId: order.id };
      }
      const retryError = rejectWrongPaymentProvider(refetched, "flutterwave");
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

  const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

  if (updated.confirmationEmailedAt) {
    await ensureCustomerReceiptWhatsApp(updated.id);
    return {
      ok: true,
      reason: "Already fulfilled",
      orderId: updated.id,
      emailSent: true,
    };
  }

  if (!email || !email.includes("@") || email.includes("pending@checkout")) {
    return {
      ok: true,
      reason: "Paid but email failed",
      orderId: updated.id,
      emailSent: false,
      emailError: "No customer email on Flutterwave transaction",
    };
  }

  const emailResult = await notifyOrderPaid(updated.id);
  if (emailResult.customerOk) {
    await prisma.order.update({
      where: { id: updated.id },
      data: { confirmationEmailedAt: new Date() },
    });
  }

  if (!emailResult.customerOk) {
    return {
      ok: true,
      reason: "Paid but email failed",
      orderId: updated.id,
      emailSent: false,
      emailError: emailResult.error,
    };
  }

  return {
    ok: true,
    reason: isNewlyPaid ? undefined : "Already fulfilled",
    orderId: updated.id,
    emailSent: true,
  };
}
