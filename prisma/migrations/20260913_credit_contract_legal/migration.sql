-- Credit contract: customer ID + Legal approval (replaces POS-time acceptance)

ALTER TABLE "CreditAgreement" ADD COLUMN IF NOT EXISTS "customerIdNumber" TEXT;
ALTER TABLE "CreditAgreement" ADD COLUMN IF NOT EXISTS "contractApprovedAt" TIMESTAMP(3);
ALTER TABLE "CreditAgreement" ADD COLUMN IF NOT EXISTS "contractApprovedByUserId" TEXT;

-- Backfill ID for existing rows; treat prior acceptance as approved
UPDATE "CreditAgreement"
SET
  "customerIdNumber" = COALESCE("customerIdNumber", 'LEGACY'),
  "contractApprovedAt" = COALESCE("contractApprovedAt", "contractAcceptedAt")
WHERE "customerIdNumber" IS NULL OR "contractApprovedAt" IS NULL;

ALTER TABLE "CreditAgreement" ALTER COLUMN "customerIdNumber" SET NOT NULL;

ALTER TABLE "CreditAgreement" DROP COLUMN IF EXISTS "contractAcceptedAt";

CREATE INDEX IF NOT EXISTS "CreditAgreement_contractApprovedAt_idx"
  ON "CreditAgreement"("contractApprovedAt");

ALTER TABLE "CreditAgreement"
  ADD CONSTRAINT "CreditAgreement_contractApprovedByUserId_fkey"
  FOREIGN KEY ("contractApprovedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
