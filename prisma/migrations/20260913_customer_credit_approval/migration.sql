-- Admin must approve customers before in-store credit (Ghana only)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditApprovedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creditApprovedByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "User_creditApproved_idx" ON "User"("creditApproved");

ALTER TABLE "User"
  ADD CONSTRAINT "User_creditApprovedByUserId_fkey"
  FOREIGN KEY ("creditApprovedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
