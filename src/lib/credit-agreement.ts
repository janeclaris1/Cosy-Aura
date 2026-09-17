import type { PosPaymentMethod, Prisma } from "@prisma/client";
import {
  computeCreditSplit,
  creditDueDate,
  roundCreditGhs,
} from "@/lib/credit-contract";
import { prisma } from "@/lib/prisma";
import type { AdminContext } from "@/lib/admin";
import {
  creditAgreementAccessibleToAdmin,
  creditAgreementWhere,
  orderAccessibleToAdmin,
} from "@/lib/credit-scope";
import { postCreditBalancePaymentJournal, postCreditDefaultJournal } from "@/lib/accounting-credit-post";
import { restoreOrderInventory } from "@/lib/inventory";
import { releaseCreditOrderFulfillment } from "@/lib/pos";

const DOWN_PAYMENT_METHODS: PosPaymentMethod[] = ["CASH", "MOMO", "CARD", "OTHER"];

export function isDownPaymentMethod(method: string): method is PosPaymentMethod {
  return (DOWN_PAYMENT_METHODS as string[]).includes(method);
}

export async function resolveCustomerUserId(input: {
  email?: string | null;
  phone?: string | null;
}): Promise<string | null> {
  const email = input.email?.trim().toLowerCase();
  if (email && !email.endsWith("@cosyaura.local")) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  const phone = input.phone?.trim();
  if (phone) {
    const byPhone = await prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (byPhone) return byPhone.id;
  }

  return null;
}

export function creditBalanceRemaining(agreement: {
  balanceDueGhs: number;
  balancePaidGhs: number;
}) {
  return roundCreditGhs(
    Math.max(0, agreement.balanceDueGhs - agreement.balancePaidGhs)
  );
}

export async function recordCreditBalancePayment(
  ctx: AdminContext,
  agreementId: string,
  input: {
    amountGhs: number;
    paymentMethod: PosPaymentMethod;
    paymentReference?: string;
  }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isDownPaymentMethod(input.paymentMethod)) {
    return { ok: false, reason: "Invalid payment method" };
  }

  const amount = roundCreditGhs(input.amountGhs);
  if (amount <= 0) return { ok: false, reason: "Amount must be greater than zero" };

  if (!(await creditAgreementAccessibleToAdmin(ctx, agreementId))) {
    return { ok: false, reason: "Forbidden" };
  }

  let fullyPaid = false;
  let orderId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const agreement = await tx.creditAgreement.findUnique({
        where: { id: agreementId },
        include: {
          order: {
            select: {
              id: true,
              receiptNumber: true,
              fulfillmentBranchId: true,
            },
          },
        },
      });
      if (!agreement) throw new Error("Credit agreement not found");
      if (agreement.status !== "ACTIVE") {
        throw new Error("This credit agreement is not active");
      }

      const remaining = creditBalanceRemaining(agreement);
      if (amount > remaining + 0.009) {
        throw new Error(`Payment exceeds balance due (GHS ${remaining})`);
      }

      const payment = await tx.creditPayment.create({
        data: {
          creditAgreementId: agreementId,
          amountGhs: amount,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference?.trim() || null,
          recordedByUserId: ctx.userId,
        },
      });

      const newPaid = roundCreditGhs(agreement.balancePaidGhs + amount);
      fullyPaid = newPaid >= agreement.balanceDueGhs - 0.009;
      orderId = agreement.orderId;

      await tx.creditAgreement.update({
        where: { id: agreementId },
        data: {
          balancePaidGhs: newPaid,
          status: fullyPaid ? "PAID" : "ACTIVE",
        },
      });

      await postCreditBalancePaymentJournal(tx, {
        creditPaymentId: payment.id,
        agreementId,
        orderId: agreement.orderId,
        amountGhs: amount,
        paymentMethod: input.paymentMethod,
        branchId: agreement.order.fulfillmentBranchId,
        actorUserId: ctx.userId,
        receiptNumber: agreement.order.receiptNumber,
      });
    });

    if (fullyPaid && orderId) {
      const released = await releaseCreditOrderFulfillment(orderId, {
        actorUserId: ctx.userId,
      });
      if (!released.ok) {
        return { ok: false, reason: released.reason };
      }
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Payment failed",
    };
  }
}

export async function processOverdueCreditDefaults(
  actorUserId: string,
  scope: ReturnType<typeof creditAgreementWhere> = {}
) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const overdue = await prisma.creditAgreement.findMany({
    where: {
      status: "ACTIVE",
      dueDate: { lt: today },
      ...scope,
    },
    select: { id: true },
  });

  let processed = 0;
  for (const row of overdue) {
    const agreement = await prisma.creditAgreement.findUnique({
      where: { id: row.id },
    });
    if (!agreement || agreement.status !== "ACTIVE") continue;
    if (creditBalanceRemaining(agreement) <= 0) {
      await prisma.creditAgreement.update({
        where: { id: row.id },
        data: { status: "PAID" },
      });
      continue;
    }

    try {
      const result = await prisma.$transaction((tx) =>
        postCreditDefaultJournal(tx, row.id, actorUserId)
      );
      if (result.restoreStock) {
        await restoreOrderInventory(result.orderId);
      }
      processed += 1;
    } catch (err) {
      console.error("[credit] default failed", row.id, err);
    }
  }

  return { processed, total: overdue.length };
}

export type CreditAgreementCreateInput = {
  orderId: string;
  userId: string | null;
  totalGhs: number;
  customerIdNumber: string;
};

/** POS receipt may print only after Legal records contract signature + down payment. */
export function creditReceiptReady(agreement: {
  downPaymentReceivedAt: Date | null;
}): boolean {
  return agreement.downPaymentReceivedAt != null;
}

export async function createCreditAgreementRecord(
  client: Prisma.TransactionClient,
  input: CreditAgreementCreateInput
) {
  const { downPaymentGhs, balanceDueGhs } = computeCreditSplit(input.totalGhs);
  return client.creditAgreement.create({
    data: {
      orderId: input.orderId,
      userId: input.userId,
      customerIdNumber: input.customerIdNumber.trim(),
      totalGhs: input.totalGhs,
      downPaymentGhs,
      balanceDueGhs,
      dueDate: creditDueDate(new Date()),
    },
  });
}

export async function recordCreditDownPayment(
  ctx: AdminContext,
  orderId: string,
  input: {
    downPaymentMethod: PosPaymentMethod;
    downPaymentReference?: string;
  }
): Promise<
  { ok: true; receiptUrl: string } | { ok: false; reason: string }
> {
  if (!isDownPaymentMethod(input.downPaymentMethod)) {
    return { ok: false, reason: "Select how the down payment was collected" };
  }

  if (!(await orderAccessibleToAdmin(ctx, orderId))) {
    return { ok: false, reason: "Forbidden" };
  }

  const agreement = await prisma.creditAgreement.findUnique({
    where: { orderId },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          channel: true,
          fulfillmentBranchId: true,
        },
      },
    },
  });

  if (!agreement) {
    return { ok: false, reason: "Credit agreement not found" };
  }
  if (agreement.order.channel !== "POS") {
    return { ok: false, reason: "Not a POS credit sale" };
  }
  if (!agreement.contractApprovedAt) {
    return {
      ok: false,
      reason: "Generate and print the contract before recording payment",
    };
  }
  if (creditReceiptReady(agreement)) {
    return { ok: false, reason: "Down payment already recorded" };
  }
  if (
    agreement.order.status === "REFUNDED" ||
    agreement.order.status === "CANCELLED"
  ) {
    return { ok: false, reason: "This sale was voided" };
  }

  const signedAt = new Date();
  const paymentRef = input.downPaymentReference?.trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.creditAgreement.update({
      where: { id: agreement.id },
      data: {
        downPaymentMethod: input.downPaymentMethod,
        downPaymentReference: paymentRef,
        downPaymentReceivedAt: signedAt,
        downPaymentRecordedByUserId: ctx.userId,
        dueDate: creditDueDate(signedAt),
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PARTIALLY_PAID",
        posPaymentReference: paymentRef,
      },
    });
  });

  const { hookOrderSalesJournal } = await import("./accounting-order-hook");
  hookOrderSalesJournal(orderId, {
    actorUserId: ctx.userId,
    isCreditSale: true,
  });

  return { ok: true, receiptUrl: `/admin/pos/receipt/${orderId}` };
}

export async function approveCreditContract(
  ctx: AdminContext,
  orderId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!(await orderAccessibleToAdmin(ctx, orderId))) {
    return { ok: false, reason: "Forbidden" };
  }

  const agreement = await prisma.creditAgreement.findUnique({
    where: { orderId },
    include: {
      order: { select: { status: true, channel: true } },
    },
  });

  if (!agreement) {
    return { ok: false, reason: "Credit agreement not found" };
  }
  if (agreement.order.channel !== "POS") {
    return { ok: false, reason: "Not a POS credit sale" };
  }
  if (agreement.contractApprovedAt) {
    return { ok: false, reason: "Contract is already approved" };
  }
  if (
    agreement.order.status === "REFUNDED" ||
    agreement.order.status === "CANCELLED"
  ) {
    return { ok: false, reason: "This sale was voided" };
  }

  await prisma.creditAgreement.update({
    where: { id: agreement.id },
    data: {
      contractApprovedAt: new Date(),
      contractApprovedByUserId: ctx.userId,
    },
  });

  return { ok: true };
}
