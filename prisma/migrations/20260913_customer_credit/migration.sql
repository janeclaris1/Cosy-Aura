-- AlterEnum
ALTER TYPE "PosPaymentMethod" ADD VALUE 'CREDIT';

-- CreateEnum
CREATE TYPE "CreditAgreementStatus" AS ENUM ('ACTIVE', 'PAID', 'DEFAULTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "JournalSource" ADD VALUE 'CREDIT_PAYMENT';
ALTER TYPE "JournalSource" ADD VALUE 'CREDIT_DEFAULT';

-- CreateTable
CREATE TABLE "CreditAgreement" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "totalGhs" DOUBLE PRECISION NOT NULL,
    "downPaymentGhs" DOUBLE PRECISION NOT NULL,
    "balanceDueGhs" DOUBLE PRECISION NOT NULL,
    "balancePaidGhs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downPaymentMethod" "PosPaymentMethod" NOT NULL,
    "downPaymentReference" TEXT,
    "contractAcceptedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "CreditAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultedAt" TIMESTAMP(3),
    "penaltyGhs" DOUBLE PRECISION,
    "refundGhs" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPayment" (
    "id" TEXT NOT NULL,
    "creditAgreementId" TEXT NOT NULL,
    "amountGhs" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PosPaymentMethod" NOT NULL,
    "paymentReference" TEXT,
    "recordedByUserId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditAgreement_orderId_key" ON "CreditAgreement"("orderId");

-- CreateIndex
CREATE INDEX "CreditAgreement_userId_idx" ON "CreditAgreement"("userId");

-- CreateIndex
CREATE INDEX "CreditAgreement_status_idx" ON "CreditAgreement"("status");

-- CreateIndex
CREATE INDEX "CreditAgreement_dueDate_idx" ON "CreditAgreement"("dueDate");

-- CreateIndex
CREATE INDEX "CreditPayment_creditAgreementId_idx" ON "CreditPayment"("creditAgreementId");

-- CreateIndex
CREATE INDEX "CreditPayment_paidAt_idx" ON "CreditPayment"("paidAt");

-- AddForeignKey
ALTER TABLE "CreditAgreement" ADD CONSTRAINT "CreditAgreement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAgreement" ADD CONSTRAINT "CreditAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_creditAgreementId_fkey" FOREIGN KEY ("creditAgreementId") REFERENCES "CreditAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPayment" ADD CONSTRAINT "CreditPayment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Chart of accounts: customer receivables + credit penalties
INSERT INTO "GlAccount" ("id", "country", "code", "name", "type", "description", "active", "createdAt", "updatedAt")
VALUES
  ('glacc_gh_1200', 'GH', '1200', 'Accounts Receivable', 'ASSET', 'Customer credit balances', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('glacc_gh_4091', 'GH', '4091', 'Credit Contract Penalties', 'REVENUE', 'Forfeited deposits on defaulted credit sales', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("country", "code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "description" = EXCLUDED."description",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
