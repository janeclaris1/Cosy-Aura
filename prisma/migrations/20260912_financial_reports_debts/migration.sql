-- Financial reports: debt register + loan COA accounts

ALTER TYPE "JournalSource" ADD VALUE IF NOT EXISTS 'DEBT';

CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'DEFAULTED');
CREATE TYPE "DebtType" AS ENUM ('BANK_LOAN', 'SUPPLIER', 'OTHER');

CREATE TABLE "CompanyDebt" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GH',
    "lender" TEXT NOT NULL,
    "description" TEXT,
    "debtType" "DebtType" NOT NULL DEFAULT 'BANK_LOAN',
    "glAccountCode" TEXT NOT NULL DEFAULT '2200',
    "principalGhs" DOUBLE PRECISION NOT NULL,
    "balanceGhs" DOUBLE PRECISION NOT NULL,
    "interestRatePct" DOUBLE PRECISION,
    "startDate" DATE NOT NULL,
    "maturityDate" DATE,
    "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDebt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "principalGhs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interestGhs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidFrom" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "memo" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompanyDebt_country_idx" ON "CompanyDebt"("country");
CREATE INDEX "CompanyDebt_status_idx" ON "CompanyDebt"("status");
CREATE INDEX "CompanyDebt_maturityDate_idx" ON "CompanyDebt"("maturityDate");
CREATE INDEX "DebtPayment_debtId_idx" ON "DebtPayment"("debtId");
CREATE INDEX "DebtPayment_paymentDate_idx" ON "DebtPayment"("paymentDate");

ALTER TABLE "CompanyDebt" ADD CONSTRAINT "CompanyDebt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "CompanyDebt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "GlAccount" ("id", "country", "code", "name", "type", "description", "active", "createdAt", "updatedAt")
VALUES
  ('glacc_gh_2200', 'GH', '2200', 'Long-term Loans Payable', 'LIABILITY', 'Bank & term loans', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('glacc_gh_2210', 'GH', '2210', 'Short-term Loans Payable', 'LIABILITY', 'Overdrafts & short-term borrowings', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('glacc_gh_6280', 'GH', '6280', 'Interest Expense', 'EXPENSE', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("country", "code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
