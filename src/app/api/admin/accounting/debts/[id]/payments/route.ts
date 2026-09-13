import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { roundLedger } from "@/lib/accounting";
import { parseDebtPaidFrom, postDebtPaymentJournal } from "@/lib/accounting-debt";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await requireAdminApi("accounting.write", {
    req,
    rateLimitKey: "accounting-debt-pay",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const principalGhs = Number(body.principalGhs ?? 0);
  const interestGhs = Number(body.interestGhs ?? 0);
  const paidFrom = parseDebtPaidFrom(String(body.paidFrom || "BANK"));
  const memo = body.memo ? String(body.memo).trim() : undefined;

  const dateRaw = body.paymentDate
    ? String(body.paymentDate)
    : new Date().toISOString().slice(0, 10);
  const paymentDate = new Date(`${dateRaw}T12:00:00.000Z`);

  if (!paidFrom) {
    return NextResponse.json({ error: "paidFrom must be BANK, MOMO, or CASH" }, { status: 400 });
  }
  if (Number.isNaN(paymentDate.getTime())) {
    return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
  }
  if (
    !Number.isFinite(principalGhs) ||
    !Number.isFinite(interestGhs) ||
    (principalGhs <= 0 && interestGhs <= 0)
  ) {
    return NextResponse.json({ error: "Enter principal and/or interest amount" }, { status: 400 });
  }

  try {
    const debt = await prisma.companyDebt.findUnique({ where: { id: params.id } });
    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }
    if (debt.status !== "ACTIVE") {
      return NextResponse.json({ error: "Debt is not active" }, { status: 400 });
    }
    if (principalGhs > debt.balanceGhs + 0.01) {
      return NextResponse.json({ error: "Principal exceeds remaining balance" }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const row = await tx.debtPayment.create({
        data: {
          debtId: debt.id,
          paymentDate,
          principalGhs: roundLedger(principalGhs),
          interestGhs: roundLedger(interestGhs),
          paidFrom,
          memo,
          createdById: ctx.userId,
        },
      });

      const journal = await postDebtPaymentJournal(tx, {
        glAccountCode: debt.glAccountCode,
        principalGhs,
        interestGhs,
        entryDate: paymentDate,
        paidFrom,
        lender: debt.lender,
        paymentId: row.id,
        createdById: ctx.userId,
        memo,
      });

      const newBalance = roundLedger(debt.balanceGhs - principalGhs);
      await tx.debtPayment.update({
        where: { id: row.id },
        data: { journalEntryId: journal.id },
      });
      await tx.companyDebt.update({
        where: { id: debt.id },
        data: {
          balanceGhs: Math.max(0, newBalance),
          status: newBalance <= 0.01 ? "PAID_OFF" : "ACTIVE",
        },
      });

      return row;
    });

    await writeAuditLog({
      actorId: ctx.userId,
      action: "accounting.debt.payment",
      entityType: "DebtPayment",
      entityId: payment.id,
      summary: `Debt payment ${debt.lender} GHS ${roundLedger(principalGhs + interestGhs).toFixed(2)}`,
      req,
    });

    return NextResponse.json({ payment });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to record payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
