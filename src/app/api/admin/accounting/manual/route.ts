import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { ensureGhanaCoa } from "@/lib/accounting";
import {
  parseManualEntryKind,
  postManualCashEntry,
} from "@/lib/accounting-manual";
import type { PaymentSource } from "@/lib/accounting-gh-coa";
import { prisma } from "@/lib/prisma";

function parsePaymentSource(raw: string): PaymentSource | null {
  const v = raw.trim().toUpperCase();
  if (v === "BANK" || v === "MOMO" || v === "CASH") return v;
  return null;
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.write", {
    req,
    rateLimitKey: "accounting-manual",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = parseManualEntryKind(String(body.kind || ""));
  const amount = Number(body.amount);
  const cashAccount = parsePaymentSource(String(body.cashAccount || body.paidFrom || "BANK"));
  const assetAccountCode = body.assetAccountCode
    ? String(body.assetAccountCode).trim()
    : undefined;
  const revenueAccountCode = body.revenueAccountCode
    ? String(body.revenueAccountCode).trim()
    : undefined;
  const memo = body.memo ? String(body.memo).trim() : undefined;

  if (!kind) {
    return NextResponse.json({ error: "Select a valid entry type" }, { status: 400 });
  }
  if (!cashAccount) {
    return NextResponse.json(
      { error: "cashAccount must be BANK, MOMO, or CASH" },
      { status: 400 }
    );
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
    const journal = await postManualCashEntry(prisma, {
      kind,
      amount,
      entryDate,
      cashAccount,
      assetAccountCode,
      revenueAccountCode,
      memo,
      createdById: ctx.userId,
    });

    await writeAuditLog({
      actorId: ctx.userId,
      action: "accounting.manual",
      entityType: "JournalEntry",
      entityId: journal.id,
      summary: `Manual entry ${kind} GHS ${amount.toFixed(2)}`,
      req,
      metadata: { kind, amount, cashAccount },
    });

    return NextResponse.json({ journal });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to record entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
