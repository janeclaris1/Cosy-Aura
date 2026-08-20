import { prisma } from "./prisma";
import { ensureCustomerReceiptWhatsApp, notifyOrderPaid } from "./notifications";
import { verifyFlutterwaveTransaction } from "./flutterwave";

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

  const order =
    (await prisma.order.findFirst({
      where: {
        OR: [
          { flutterwaveTxRef: txn.tx_ref },
          { id: String(txn.meta?.orderId || "") },
        ],
      },
    })) || null;

  if (!order) {
    return { ok: false, reason: "Order not found", orderId: txn.meta?.orderId };
  }

  const email = txn.customer?.email || order.email;
  const alreadyPaid = order.status !== "PENDING";

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: alreadyPaid ? order.status : "PAID",
      email: email || order.email,
      paymentProvider: "flutterwave",
      flutterwaveTxRef: txn.tx_ref,
      stripePaymentId: String(txn.id),
      shippingPhone:
        txn.customer?.phone_number ||
        txn.customer?.phonenumber ||
        order.shippingPhone,
    },
  });

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
      emailError: "No customer email on Flutterwave transaction",
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
