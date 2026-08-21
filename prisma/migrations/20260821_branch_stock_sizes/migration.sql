-- Per-size branch stock (30 / 50 / 100ml) + order item bottle size

ALTER TABLE "BranchStock" ADD COLUMN IF NOT EXISTS "bottleSize" INTEGER NOT NULL DEFAULT 50;

DO $$ BEGIN
  ALTER TABLE "BranchStock" DROP CONSTRAINT IF EXISTS "BranchStock_branchId_fragranceId_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "BranchStock_branchId_fragranceId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "BranchStock_branchId_fragranceId_bottleSize_key"
  ON "BranchStock"("branchId", "fragranceId", "bottleSize");

CREATE INDEX IF NOT EXISTS "BranchStock_bottleSize_idx" ON "BranchStock"("bottleSize");

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "bottleSize" INTEGER NOT NULL DEFAULT 50;
