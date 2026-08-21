-- Phase 6: transfer approval status

DO $$ BEGIN
  CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "status" "StockTransferStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "StockTransfer_status_idx" ON "StockTransfer"("status");

DO $$ BEGIN
  ALTER TABLE "StockTransfer"
    ADD CONSTRAINT "StockTransfer_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
