import type { Prisma, PrismaClient } from "@prisma/client";
import {
  GH_ACCOUNTING_COUNTRY,
  PAYMENT_SOURCE_ACCOUNT,
  type PaymentSource,
} from "@/lib/accounting-gh-coa";
import {
  createPostedJournal,
  ensureGhanaCoa,
  getAccountsByCodes,
  roundLedger,
  type DraftJournalLine,
} from "@/lib/accounting";

type TxClient = Prisma.TransactionClient | PrismaClient;

export const MANUAL_ENTRY_KINDS = [
  "CAPITAL_INJECTION",
  "OWNER_WITHDRAWAL",
  "EQUIPMENT_PURCHASE",
  "ASSET_DISPOSAL",
  "OTHER_INCOME",
] as const;

export type ManualEntryKind = (typeof MANUAL_ENTRY_KINDS)[number];

export const OWNER_EQUITY_CODE = "3100";
export const INVESTING_ASSET_CODES = ["1300", "1310"] as const;
export const OTHER_REVENUE_CODE = "4090";

const KIND_LABELS: Record<ManualEntryKind, string> = {
  CAPITAL_INJECTION: "Owner capital injection",
  OWNER_WITHDRAWAL: "Owner withdrawal",
  EQUIPMENT_PURCHASE: "Equipment & asset purchase",
  ASSET_DISPOSAL: "Asset sale proceeds",
  OTHER_INCOME: "Other business income",
};

export function parseManualEntryKind(raw: string): ManualEntryKind | null {
  const v = raw.trim().toUpperCase();
  return (MANUAL_ENTRY_KINDS as readonly string[]).includes(v)
    ? (v as ManualEntryKind)
    : null;
}

export function assertInvestingAssetCode(code: string) {
  if (!(INVESTING_ASSET_CODES as readonly string[]).includes(code)) {
    throw new Error("Select Store Equipment (1300) or POS Hardware (1310)");
  }
}

function assertRevenueCode(code: string) {
  if (!/^40[0-9]{2}$/.test(code)) {
    throw new Error("Select a valid revenue account (4010–4090)");
  }
}

export async function postManualCashEntry(
  client: TxClient,
  input: {
    kind: ManualEntryKind;
    amount: number;
    entryDate: Date;
    cashAccount: PaymentSource;
    assetAccountCode?: string;
    revenueAccountCode?: string;
    memo?: string;
    createdById: string;
  }
) {
  await ensureGhanaCoa(client);
  const amount = roundLedger(input.amount);
  if (amount <= 0) throw new Error("Amount must be greater than zero");

  const paymentCode = PAYMENT_SOURCE_ACCOUNT[input.cashAccount];
  const codes = [paymentCode, OWNER_EQUITY_CODE];

  if (input.kind === "EQUIPMENT_PURCHASE" || input.kind === "ASSET_DISPOSAL") {
    if (!input.assetAccountCode) throw new Error("Select an asset account");
    assertInvestingAssetCode(input.assetAccountCode);
    codes.push(input.assetAccountCode);
  }

  if (input.kind === "OTHER_INCOME") {
    const revenueCode = input.revenueAccountCode || OTHER_REVENUE_CODE;
    assertRevenueCode(revenueCode);
    codes.push(revenueCode);
  }

  const accounts = await getAccountsByCodes(client, GH_ACCOUNTING_COUNTRY, codes);
  const cash = accounts.get(paymentCode);
  if (!cash) throw new Error(`Missing payment account ${paymentCode}`);

  const lines: DraftJournalLine[] = [];
  const label = KIND_LABELS[input.kind];

  switch (input.kind) {
    case "CAPITAL_INJECTION": {
      const equity = accounts.get(OWNER_EQUITY_CODE);
      if (!equity) throw new Error("Missing owner's equity account 3100");
      lines.push(
        { accountId: cash.id, debit: amount, credit: 0, memo: label },
        { accountId: equity.id, debit: 0, credit: amount, memo: label }
      );
      break;
    }
    case "OWNER_WITHDRAWAL": {
      const equity = accounts.get(OWNER_EQUITY_CODE);
      if (!equity) throw new Error("Missing owner's equity account 3100");
      lines.push(
        { accountId: equity.id, debit: amount, credit: 0, memo: label },
        { accountId: cash.id, debit: 0, credit: amount, memo: label }
      );
      break;
    }
    case "EQUIPMENT_PURCHASE": {
      const asset = accounts.get(input.assetAccountCode!);
      if (!asset) throw new Error(`Missing asset account ${input.assetAccountCode}`);
      lines.push(
        { accountId: asset.id, debit: amount, credit: 0, memo: label },
        { accountId: cash.id, debit: 0, credit: amount, memo: `Paid from ${cash.name}` }
      );
      break;
    }
    case "ASSET_DISPOSAL": {
      const asset = accounts.get(input.assetAccountCode!);
      if (!asset) throw new Error(`Missing asset account ${input.assetAccountCode}`);
      lines.push(
        { accountId: cash.id, debit: amount, credit: 0, memo: label },
        { accountId: asset.id, debit: 0, credit: amount, memo: asset.name }
      );
      break;
    }
    case "OTHER_INCOME": {
      const revenueCode = input.revenueAccountCode || OTHER_REVENUE_CODE;
      const revenue = accounts.get(revenueCode);
      if (!revenue) throw new Error(`Missing revenue account ${revenueCode}`);
      lines.push(
        { accountId: cash.id, debit: amount, credit: 0, memo: label },
        { accountId: revenue.id, debit: 0, credit: amount, memo: revenue.name }
      );
      break;
    }
  }

  const entryId = crypto.randomUUID();

  return createPostedJournal(client, {
    country: GH_ACCOUNTING_COUNTRY,
    entryDate: input.entryDate,
    reference: `MAN-${input.kind.slice(0, 4)}-${entryId.slice(0, 8).toUpperCase()}`,
    memo: input.memo || label,
    source: "MANUAL",
    sourceId: entryId,
    createdById: input.createdById,
    lines,
  });
}
