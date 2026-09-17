-- AlterTable
ALTER TABLE "CheckoutAbandonment" ADD COLUMN "recoveryToken" TEXT;
ALTER TABLE "CheckoutAbandonment" ADD COLUMN "recoveryEmailedAt" TIMESTAMP(3);
ALTER TABLE "CheckoutAbandonment" ADD COLUMN "recoveryEmailCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "CheckoutAbandonment"
SET "recoveryToken" = md5(random()::text || clock_timestamp()::text || id)
WHERE "recoveryToken" IS NULL;

ALTER TABLE "CheckoutAbandonment" ALTER COLUMN "recoveryToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutAbandonment_recoveryToken_key" ON "CheckoutAbandonment"("recoveryToken");
