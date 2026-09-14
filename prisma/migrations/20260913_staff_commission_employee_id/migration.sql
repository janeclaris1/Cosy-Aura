-- Link commissions to EmployeeProfile (staff ID) instead of User login id

ALTER TABLE "StaffCommissionEntry" ADD COLUMN "employeeId" TEXT;

UPDATE "StaffCommissionEntry" sce
SET "employeeId" = ep.id
FROM "EmployeeProfile" ep
WHERE ep."userId" = sce."staffUserId";

DELETE FROM "StaffCommissionEntry" WHERE "employeeId" IS NULL;

ALTER TABLE "StaffCommissionEntry" ALTER COLUMN "employeeId" SET NOT NULL;

ALTER TABLE "StaffCommissionEntry" DROP CONSTRAINT "StaffCommissionEntry_staffUserId_fkey";
DROP INDEX IF EXISTS "StaffCommissionEntry_staffUserId_status_earnedAt_idx";
ALTER TABLE "StaffCommissionEntry" DROP COLUMN "staffUserId";

CREATE INDEX "StaffCommissionEntry_employeeId_status_earnedAt_idx"
  ON "StaffCommissionEntry"("employeeId", "status", "earnedAt");

ALTER TABLE "StaffCommissionEntry"
  ADD CONSTRAINT "StaffCommissionEntry_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
