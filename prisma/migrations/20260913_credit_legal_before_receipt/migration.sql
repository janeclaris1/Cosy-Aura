-- Down payment collected in Legal after contract signature (not at POS checkout)

ALTER TABLE "CreditAgreement" ALTER COLUMN "downPaymentMethod" DROP NOT NULL;

ALTER TABLE "CreditAgreement" ADD COLUMN IF NOT EXISTS "downPaymentReceivedAt" TIMESTAMP(3);
ALTER TABLE "CreditAgreement" ADD COLUMN IF NOT EXISTS "downPaymentRecordedByUserId" TEXT;

-- Existing credit sales already paid at POS: treat as signed & paid
UPDATE "CreditAgreement"
SET "downPaymentReceivedAt" = COALESCE("contractApprovedAt", "createdAt")
WHERE "downPaymentMethod" IS NOT NULL
  AND "downPaymentReceivedAt" IS NULL;

ALTER TABLE "CreditAgreement"
  ADD CONSTRAINT "CreditAgreement_downPaymentRecordedByUserId_fkey"
  FOREIGN KEY ("downPaymentRecordedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
