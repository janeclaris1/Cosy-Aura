import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GH_ACCOUNTING_COUNTRY, GH_COA_SEED } from "@/lib/accounting-gh-coa";

export function roundLedger(value: number): number {
  return Math.round(value * 100) / 100;
}

type TxClient = Prisma.TransactionClient | PrismaClient;

function isRootPrismaClient(client: TxClient): client is PrismaClient {
  return typeof (client as PrismaClient).$transaction === "function";
}

/**
 * Ensure Ghana COA rows exist. Fast-path when migration already seeded accounts.
 * Never bulk-upserts inside an interactive transaction (Neon pooler timeouts).
 */
export async function ensureGhanaCoa(client: TxClient = prisma) {
  const existing = await client.glAccount.count({
    where: { country: GH_ACCOUNTING_COUNTRY, active: true },
  });
  if (existing >= GH_COA_SEED.length) return;

  const writer = isRootPrismaClient(client) ? client : prisma;
  for (const row of GH_COA_SEED) {
    await writer.glAccount.upsert({
      where: {
        country_code: { country: GH_ACCOUNTING_COUNTRY, code: row.code },
      },
      create: {
        id: row.id,
        country: GH_ACCOUNTING_COUNTRY,
        code: row.code,
        name: row.name,
        type: row.type,
        description: row.description ?? null,
      },
      update: {
        name: row.name,
        type: row.type,
        description: row.description ?? null,
        active: true,
      },
    });
  }
}

export async function getAccountsByCodes(
  client: TxClient,
  country: string,
  codes: string[]
): Promise<Map<string, { id: string; code: string; name: string }>> {
  const accounts = await client.glAccount.findMany({
    where: { country, code: { in: codes }, active: true },
    select: { id: true, code: true, name: true },
  });
  return new Map(accounts.map((a) => [a.code, a]));
}

export type DraftJournalLine = {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
};

export function assertBalanced(lines: DraftJournalLine[]) {
  const debits = roundLedger(lines.reduce((s, l) => s + l.debit, 0));
  const credits = roundLedger(lines.reduce((s, l) => s + l.credit, 0));
  if (debits !== credits) {
    throw new Error(`Journal out of balance: debits ${debits} ≠ credits ${credits}`);
  }
  if (debits <= 0) {
    throw new Error("Journal must have a non-zero total");
  }
}

export async function createPostedJournal(
  client: TxClient,
  input: {
    country?: string;
    entryDate: Date;
    reference: string;
    memo?: string;
    source: "MANUAL" | "PAYROLL" | "EXPENSE" | "ORDER" | "ORDER_COGS";
    sourceId?: string | null;
    branchId?: string | null;
    createdById: string;
    lines: DraftJournalLine[];
  }
) {
  assertBalanced(input.lines);

  if (input.sourceId) {
    const existing = await client.journalEntry.findFirst({
      where: { source: input.source, sourceId: input.sourceId },
      include: { lines: { include: { account: true } } },
    });
    if (existing) return existing;
  }

  return client.journalEntry.create({
    data: {
      country: input.country ?? GH_ACCOUNTING_COUNTRY,
      entryDate: input.entryDate,
      reference: input.reference,
      memo: input.memo ?? null,
      status: "POSTED",
      source: input.source,
      sourceId: input.sourceId ?? null,
      branchId: input.branchId ?? null,
      createdById: input.createdById,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debit: roundLedger(line.debit),
          credit: roundLedger(line.credit),
          memo: line.memo ?? null,
        })),
      },
    },
    include: {
      lines: { include: { account: { select: { code: true, name: true } } } },
    },
  });
}
