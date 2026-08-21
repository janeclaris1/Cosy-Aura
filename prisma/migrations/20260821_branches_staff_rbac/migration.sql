-- Multi-branch ops: branches, branch stock, staff roles, order fulfilment branch

DO $$ BEGIN
  CREATE TYPE "StaffRole" AS ENUM (
    'COUNTRY_MANAGER',
    'BRANCH_MANAGER',
    'FULFILMENT',
    'CONTENT',
    'SUPPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "staffRole" "StaffRole";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "staffCountry" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activeStaff" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "User_staffRole_idx" ON "User"("staffRole");
CREATE INDEX IF NOT EXISTS "User_staffCountry_idx" ON "User"("staffCountry");

ALTER TABLE "FragranceCountryStock" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 0;

-- Seed country pool qty from global Fragrance.stock where still 0
UPDATE "FragranceCountryStock" fcs
SET "quantity" = f."stock",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Fragrance" f
WHERE fcs."fragranceId" = f."id"
  AND fcs."quantity" = 0
  AND f."stock" > 0;

CREATE TABLE IF NOT EXISTS "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Branch_slug_key" ON "Branch"("slug");
CREATE INDEX IF NOT EXISTS "Branch_country_idx" ON "Branch"("country");
CREATE INDEX IF NOT EXISTS "Branch_active_idx" ON "Branch"("active");
CREATE INDEX IF NOT EXISTS "Branch_country_isDefault_idx" ON "Branch"("country", "isDefault");

CREATE TABLE IF NOT EXISTS "BranchStock" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BranchStock_branchId_fragranceId_key"
  ON "BranchStock"("branchId", "fragranceId");
CREATE INDEX IF NOT EXISTS "BranchStock_fragranceId_idx" ON "BranchStock"("fragranceId");
CREATE INDEX IF NOT EXISTS "BranchStock_branchId_idx" ON "BranchStock"("branchId");

DO $$ BEGIN
  ALTER TABLE "BranchStock"
    ADD CONSTRAINT "BranchStock_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BranchStock"
    ADD CONSTRAINT "BranchStock_fragranceId_fkey"
    FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StaffAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffAssignment_userId_branchId_key"
  ON "StaffAssignment"("userId", "branchId");
CREATE INDEX IF NOT EXISTS "StaffAssignment_userId_idx" ON "StaffAssignment"("userId");
CREATE INDEX IF NOT EXISTS "StaffAssignment_branchId_idx" ON "StaffAssignment"("branchId");

DO $$ BEGIN
  ALTER TABLE "StaffAssignment"
    ADD CONSTRAINT "StaffAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StaffAssignment"
    ADD CONSTRAINT "StaffAssignment_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fulfillmentBranchId" TEXT;

CREATE INDEX IF NOT EXISTS "Order_fulfillmentBranchId_idx" ON "Order"("fulfillmentBranchId");

DO $$ BEGIN
  ALTER TABLE "Order"
    ADD CONSTRAINT "Order_fulfillmentBranchId_fkey"
    FOREIGN KEY ("fulfillmentBranchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Default branches (one fulfilment hub per country to start)
INSERT INTO "Branch" ("id", "name", "slug", "country", "city", "active", "isDefault", "createdAt", "updatedAt")
VALUES
  ('branch_gh_default', 'Ghana Hub', 'ghana-hub', 'GH', 'Accra', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('branch_cm_default', 'Cameroon Hub', 'cameroon-hub', 'CM', 'Douala', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
