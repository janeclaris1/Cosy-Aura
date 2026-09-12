import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { ensureGhanaCoa } from "@/lib/accounting";
import { postExpenseJournal } from "@/lib/accounting-expense";
import type { PaymentSource } from "@/lib/accounting-gh-coa";
import { GH_EXPENSE_ACCOUNT_CODES } from "@/lib/accounting-gh-coa";
import { prisma } from "@/lib/prisma";

function parsePaymentSource(raw: string): PaymentSource | null {
  const v = raw.trim().toUpperCase();
  if (v === "BANK" || v === "MOMO" || v === "CASH") return v;
  return null;
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.write", {
    req,
    rateLimitKey: "accounting-expense",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const accountCode = String(body.accountCode || "").trim();
  const amount = Number(body.amount);
  const paidFrom = parsePaymentSource(String(body.paidFrom || "BANK"));
  const memo = body.memo ? String(body.memo).trim() : undefined;
  const vendor = body.vendor ? String(body.vendor).trim() : undefined;
  const branchId = body.branchId ? String(body.branchId).trim() : null;

  if (!accountCode || !GH_EXPENSE_ACCOUNT_CODES.includes(accountCode)) {
    return NextResponse.json({ error: "Select a valid expense account" }, { status: 400 });
  }
  if (!paidFrom) {
    return NextResponse.json({ error: "paidFrom must be BANK, MOMO, or CASH" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  const dateRaw = body.entryDate ? String(body.entryDate) : new Date().toISOString().slice(0, 10);
  const entryDate = new Date(`${dateRaw}T12:00:00.000Z`);
  if (Number.isNaN(entryDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    await ensureGhanaCoa();
    const journal = await postExpenseJournal(prisma, {
      accountCode,
      amount,
      entryDate,
      paidFrom,
      memo,
      vendor,
      branchId,
      createdById: ctx.userId,
    });

    await writeAuditLog({
      actorId: ctx.userId,
      action: "accounting.expense",
      entityType: "JournalEntry",
      entityId: journal.id,
      summary: `Recorded expense ${accountCode} GHS ${amount.toFixed(2)}`,
      req,
      metadata: { accountCode, amount, paidFrom },
    });

    return NextResponse.json({ journal });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to record expense";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
