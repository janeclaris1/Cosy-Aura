import type { Prisma } from "@prisma/client";
import {
  GH_ACCOUNTING_COUNTRY,
  PAYMENT_SOURCE_ACCOUNT,
  PAYROLL_ACCOUNTS,
} from "@/lib/accounting-gh-coa";
import {
  createPostedJournal,
  ensureGhanaCoa,
  getAccountsByCodes,
  roundLedger,
  type DraftJournalLine,
} from "@/lib/accounting";

type TxClient = Prisma.TransactionClient;

export async function postPayRunJournal(
  client: TxClient,
  payRunId: string,
  createdById: string
) {
  await ensureGhanaCoa(client);

  const payRun = await client.payRun.findUnique({
    where: { id: payRunId },
    include: {
      branch: { select: { id: true, name: true } },
      lines: true,
    },
  });

  if (!payRun) throw new Error("Pay run not found");
  if (payRun.country !== GH_ACCOUNTING_COUNTRY) {
    throw new Error("Payroll journals are only supported for Ghana pay runs");
  }
  if (!payRun.lines.length) throw new Error("Pay run has no lines");

  const employeeIds = payRun.lines.map((l) => l.employeeId);
  const profiles = await client.employeeProfile.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, paymentMethod: true },
  });
  const methodByEmployee = new Map(profiles.map((p) => [p.id, p.paymentMethod]));

  let totalGross = 0;
  let totalEmployerSsnit = 0;
  let totalPaye = 0;
  let totalSsnitEmployee = 0;
  let netBank = 0;
  let netMomo = 0;
  let netCash = 0;

  for (const line of payRun.lines) {
    totalGross += line.grossPay;
    totalEmployerSsnit += line.ssnitEmployer;
    totalPaye += line.paye;
    totalSsnitEmployee += line.ssnitEmployee;

    const method = methodByEmployee.get(line.employeeId) ?? "BANK";
    if (method === "MOMO") netMomo += line.netPay;
    else if (method === "CASH") netCash += line.netPay;
    else netBank += line.netPay;
  }

  totalGross = roundLedger(totalGross);
  totalEmployerSsnit = roundLedger(totalEmployerSsnit);
  totalPaye = roundLedger(totalPaye);
  const totalSsnitPayable = roundLedger(totalSsnitEmployee + totalEmployerSsnit);
  netBank = roundLedger(netBank);
  netMomo = roundLedger(netMomo);
  netCash = roundLedger(netCash);

  const accountCodes = [
    PAYROLL_ACCOUNTS.wages,
    PAYROLL_ACCOUNTS.employerSsnit,
    PAYROLL_ACCOUNTS.payePayable,
    PAYROLL_ACCOUNTS.ssnitPayable,
    PAYMENT_SOURCE_ACCOUNT.BANK,
    PAYMENT_SOURCE_ACCOUNT.MOMO,
    PAYMENT_SOURCE_ACCOUNT.CASH,
  ];

  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, accountCodes);

  function acct(code: string) {
    const a = accounts.get(code);
    if (!a) throw new Error(`Missing GL account ${code} — run accounting migration`);
    return a;
  }

  const draftLines: DraftJournalLine[] = [];

  if (totalGross > 0) {
    draftLines.push({
      accountId: acct(PAYROLL_ACCOUNTS.wages).id,
      debit: totalGross,
      credit: 0,
      memo: "Gross wages",
    });
  }
  if (totalEmployerSsnit > 0) {
    draftLines.push({
      accountId: acct(PAYROLL_ACCOUNTS.employerSsnit).id,
      debit: totalEmployerSsnit,
      credit: 0,
      memo: "Employer SSNIT",
    });
  }
  if (totalPaye > 0) {
    draftLines.push({
      accountId: acct(PAYROLL_ACCOUNTS.payePayable).id,
      debit: 0,
      credit: totalPaye,
      memo: "PAYE withheld",
    });
  }
  if (totalSsnitPayable > 0) {
    draftLines.push({
      accountId: acct(PAYROLL_ACCOUNTS.ssnitPayable).id,
      debit: 0,
      credit: totalSsnitPayable,
      memo: "SSNIT employee + employer",
    });
  }
  if (netBank > 0) {
    draftLines.push({
      accountId: acct(PAYMENT_SOURCE_ACCOUNT.BANK).id,
      debit: 0,
      credit: netBank,
      memo: "Net pay — bank transfer",
    });
  }
  if (netMomo > 0) {
    draftLines.push({
      accountId: acct(PAYMENT_SOURCE_ACCOUNT.MOMO).id,
      debit: 0,
      credit: netMomo,
      memo: "Net pay — mobile money",
    });
  }
  if (netCash > 0) {
    draftLines.push({
      accountId: acct(PAYMENT_SOURCE_ACCOUNT.CASH).id,
      debit: 0,
      credit: netCash,
      memo: "Net pay — cash",
    });
  }

  const branchLabel = payRun.branch?.name ? ` · ${payRun.branch.name}` : "";
  const memo = `Payroll ${payRun.periodLabel}${branchLabel} — Bank GHS ${netBank}, MoMo GHS ${netMomo}, Cash GHS ${netCash}`;

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: payRun.paidAt ?? new Date(),
    reference: `PAY-${payRun.periodLabel}${payRun.branchId ? `-${payRun.branchId.slice(-6)}` : ""}`,
    memo,
    source: "PAYROLL",
    sourceId: payRunId,
    branchId: payRun.branchId,
    createdById,
    lines: draftLines,
  });
}
