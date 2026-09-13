import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import {
  assertDebtLiabilityCode,
  parseDebtPaidFrom,
  postDebtDrawJournal,
} from "@/lib/accounting-debt";
import { ensureGhanaCoa } from "@/lib/accounting";
import { GH_ACCOUNTING_COUNTRY } from "@/lib/accounting-gh-coa";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { ctx, error } = await requireAdminApi("accounting.read");
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (typeof (prisma as { companyDebt?: unknown }).companyDebt === "undefined") {
    return NextResponse.json(
      {
        error:
          "Debt register is not loaded. Run npx prisma generate and restart the dev server.",
        debts: [],
        totalOwed: 0,
      },
      { status: 503 }
    );
  }

  const debts = await prisma.companyDebt.findMany({
    where: { country: GH_ACCOUNTING_COUNTRY },
    include: {
      payments: { orderBy: { paymentDate: "desc" }, take: 5 },
    },
    orderBy: [{ status: "asc" }, { maturityDate: "asc" }],
  });

  const totalOwed = debts
    .filter((d) => d.status === "ACTIVE")
    .reduce((s, d) => s + d.balanceGhs, 0);

  return NextResponse.json({ debts, totalOwed: Math.round(totalOwed * 100) / 100 });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireAdminApi("accounting.write", {
    req,
    rateLimitKey: "accounting-debt",
  });
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lender = String(body.lender || "").trim();
  const glAccountCode = String(body.glAccountCode || "2200").trim();
  const principalGhs = Number(body.principalGhs);
  const interestRatePct = body.interestRatePct != null ? Number(body.interestRatePct) : null;
  const description = body.description ? String(body.description).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  const debtType = String(body.debtType || "BANK_LOAN").toUpperCase();
  const recordDraw = Boolean(body.recordDraw);
  const paidTo = parseDebtPaidFrom(String(body.paidTo || "BANK"));

  const startRaw = body.startDate
    ? String(body.startDate)
    : new Date().toISOString().slice(0, 10);
  const startDate = new Date(`${startRaw}T12:00:00.000Z`);
  const maturityRaw = body.maturityDate ? String(body.maturityDate) : null;
  const maturityDate = maturityRaw
    ? new Date(`${maturityRaw}T12:00:00.000Z`)
    : null;

  if (!lender) {
    return NextResponse.json({ error: "Lender name is required" }, { status: 400 });
  }
  if (!Number.isFinite(principalGhs) || principalGhs <= 0) {
    return NextResponse.json({ error: "Enter a valid principal amount" }, { status: 400 });
  }
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }
  if (maturityDate && Number.isNaN(maturityDate.getTime())) {
    return NextResponse.json({ error: "Invalid maturity date" }, { status: 400 });
  }
  if (!["BANK_LOAN", "SUPPLIER", "OTHER"].includes(debtType)) {
    return NextResponse.json({ error: "Invalid debt type" }, { status: 400 });
  }

  try {
    assertDebtLiabilityCode(glAccountCode);
    await ensureGhanaCoa();

    const debt = await prisma.companyDebt.create({
      data: {
        country: GH_ACCOUNTING_COUNTRY,
        lender,
        description,
        debtType: debtType as "BANK_LOAN" | "SUPPLIER" | "OTHER",
        glAccountCode,
        principalGhs,
        balanceGhs: principalGhs,
        interestRatePct:
          interestRatePct != null && Number.isFinite(interestRatePct)
            ? interestRatePct
            : null,
        startDate,
        maturityDate,
        notes,
        createdById: ctx.userId,
      },
    });

    if (recordDraw) {
      if (!paidTo) {
        return NextResponse.json(
          { error: "paidTo must be BANK, MOMO, or CASH when recording draw" },
          { status: 400 }
        );
      }
      await postDebtDrawJournal(prisma, {
        glAccountCode,
        amount: principalGhs,
        entryDate: startDate,
        paidTo,
        lender,
        debtId: debt.id,
        createdById: ctx.userId,
      });
    }

    await writeAuditLog({
      actorId: ctx.userId,
      action: "accounting.debt.create",
      entityType: "CompanyDebt",
      entityId: debt.id,
      summary: `Registered debt ${lender} GHS ${principalGhs.toFixed(2)}`,
      req,
    });

    return NextResponse.json({ debt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to register debt";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
