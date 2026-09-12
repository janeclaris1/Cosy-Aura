-- Ghana chart of accounts + general ledger

CREATE TYPE "GlAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED');
CREATE TYPE "JournalSource" AS ENUM ('MANUAL', 'PAYROLL', 'EXPENSE');

CREATE TABLE "GlAccount" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GH',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GlAccountType" NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GH',
    "entryDate" DATE NOT NULL,
    "reference" TEXT NOT NULL,
    "memo" TEXT,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
    "source" "JournalSource" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "branchId" TEXT,
    "createdById" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GlAccount_country_code_key" ON "GlAccount"("country", "code");
CREATE INDEX "GlAccount_country_idx" ON "GlAccount"("country");
CREATE INDEX "GlAccount_type_idx" ON "GlAccount"("type");
CREATE INDEX "GlAccount_active_idx" ON "GlAccount"("active");

CREATE UNIQUE INDEX "JournalEntry_source_sourceId_key" ON "JournalEntry"("source", "sourceId");
CREATE INDEX "JournalEntry_country_idx" ON "JournalEntry"("country");
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");
CREATE INDEX "JournalEntry_branchId_idx" ON "JournalEntry"("branchId");

CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

ALTER TABLE "GlAccount" ADD CONSTRAINT "GlAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GlAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed Ghana chart of accounts (Cosy Aura perfume retail)
INSERT INTO "GlAccount" ("id", "country", "code", "name", "type", "description", "updatedAt") VALUES
  ('glacc_gh_1010', 'GH', '1010', 'Cash in Bank', 'ASSET', 'Operating bank accounts', CURRENT_TIMESTAMP),
  ('glacc_gh_1020', 'GH', '1020', 'Mobile Money', 'ASSET', 'MoMo wallets (MTN, Telecel, etc.)', CURRENT_TIMESTAMP),
  ('glacc_gh_1030', 'GH', '1030', 'Petty Cash', 'ASSET', 'Cash on hand for small payments', CURRENT_TIMESTAMP),
  ('glacc_gh_1100', 'GH', '1100', 'Inventory - Perfume Oils', 'ASSET', 'Raw oils and aroma materials', CURRENT_TIMESTAMP),
  ('glacc_gh_1110', 'GH', '1110', 'Inventory - Finished Goods', 'ASSET', 'Bottled retail perfumes', CURRENT_TIMESTAMP),
  ('glacc_gh_1120', 'GH', '1120', 'Inventory - Packaging', 'ASSET', 'Bottles, boxes, atomizers', CURRENT_TIMESTAMP),
  ('glacc_gh_1300', 'GH', '1300', 'Store Equipment & Fixtures', 'ASSET', 'Shelving, displays, testers', CURRENT_TIMESTAMP),
  ('glacc_gh_1310', 'GH', '1310', 'POS Hardware', 'ASSET', 'Tablets, printers, scanners', CURRENT_TIMESTAMP),
  ('glacc_gh_2100', 'GH', '2100', 'Accounts Payable', 'LIABILITY', 'Supplier balances owed', CURRENT_TIMESTAMP),
  ('glacc_gh_2110', 'GH', '2110', 'PAYE Payable', 'LIABILITY', 'Employee income tax withheld', CURRENT_TIMESTAMP),
  ('glacc_gh_2120', 'GH', '2120', 'SSNIT Payable', 'LIABILITY', 'Employee + employer SSNIT due', CURRENT_TIMESTAMP),
  ('glacc_gh_2130', 'GH', '2130', 'VAT Payable', 'LIABILITY', 'VAT collected on sales', CURRENT_TIMESTAMP),
  ('glacc_gh_2140', 'GH', '2140', 'NHIL Payable', 'LIABILITY', 'NHIL collected on sales', CURRENT_TIMESTAMP),
  ('glacc_gh_2150', 'GH', '2150', 'GETFund Payable', 'LIABILITY', 'GETFund levy collected', CURRENT_TIMESTAMP),
  ('glacc_gh_3100', 'GH', '3100', 'Owner''s Equity', 'EQUITY', 'Owner capital', CURRENT_TIMESTAMP),
  ('glacc_gh_3200', 'GH', '3200', 'Retained Earnings', 'EQUITY', 'Accumulated profit', CURRENT_TIMESTAMP),
  ('glacc_gh_4010', 'GH', '4010', 'Retail Sales - Fragrances', 'REVENUE', 'Perfume retail income', CURRENT_TIMESTAMP),
  ('glacc_gh_4020', 'GH', '4020', 'Retail Sales - Beauty & Cosmetics', 'REVENUE', 'Skincare and cosmetics', CURRENT_TIMESTAMP),
  ('glacc_gh_4030', 'GH', '4030', 'Shipping Revenue', 'REVENUE', 'Delivery fees charged', CURRENT_TIMESTAMP),
  ('glacc_gh_5100', 'GH', '5100', 'COGS - Fragrances & Oils', 'EXPENSE', 'Direct product material costs', CURRENT_TIMESTAMP),
  ('glacc_gh_5110', 'GH', '5110', 'COGS - Packaging', 'EXPENSE', 'Bottles and boxes sold', CURRENT_TIMESTAMP),
  ('glacc_gh_5120', 'GH', '5120', 'Inbound Freight & Customs', 'EXPENSE', 'Import and freight to warehouse', CURRENT_TIMESTAMP),
  ('glacc_gh_6100', 'GH', '6100', 'Wages & Salaries Expense', 'EXPENSE', 'Gross payroll cost', CURRENT_TIMESTAMP),
  ('glacc_gh_6110', 'GH', '6110', 'Employer SSNIT Expense', 'EXPENSE', 'Employer SSNIT contribution', CURRENT_TIMESTAMP),
  ('glacc_gh_6200', 'GH', '6200', 'Rent Expense', 'EXPENSE', 'Shop and warehouse lease', CURRENT_TIMESTAMP),
  ('glacc_gh_6210', 'GH', '6210', 'Utilities Expense', 'EXPENSE', 'Electricity, water, internet', CURRENT_TIMESTAMP),
  ('glacc_gh_6220', 'GH', '6220', 'Advertising & Marketing', 'EXPENSE', 'Ads and brand campaigns', CURRENT_TIMESTAMP),
  ('glacc_gh_6230', 'GH', '6230', 'Travel & Entertainment', 'EXPENSE', 'Travel and client meals', CURRENT_TIMESTAMP),
  ('glacc_gh_6240', 'GH', '6240', 'Office & Shop Supplies', 'EXPENSE', 'Paper, tags, cleaning supplies', CURRENT_TIMESTAMP),
  ('glacc_gh_6250', 'GH', '6250', 'Merchant Processing Fees', 'EXPENSE', 'Paystack, Flutterwave, etc.', CURRENT_TIMESTAMP),
  ('glacc_gh_6260', 'GH', '6260', 'Software & Subscriptions', 'EXPENSE', 'Website, domains, tools', CURRENT_TIMESTAMP),
  ('glacc_gh_6270', 'GH', '6270', 'Depreciation Expense', 'EXPENSE', 'Equipment value over time', CURRENT_TIMESTAMP),
  ('glacc_gh_6290', 'GH', '6290', 'Other Operating Expenses', 'EXPENSE', 'Miscellaneous overhead', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
