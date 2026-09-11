-- Enable shop pickup on active branches and default new branches to pickup on.
ALTER TABLE "Branch" ALTER COLUMN "pickupEnabled" SET DEFAULT true;

UPDATE "Branch"
SET "pickupEnabled" = true
WHERE "active" = true;

-- Accra shop address (Ghana default branch)
UPDATE "Branch"
SET
  "address" = COALESCE(NULLIF(TRIM("address"), ''), '15 Odaw Street, Kokomlemle'),
  "city" = COALESCE(NULLIF(TRIM("city"), ''), 'Accra')
WHERE "country" = 'GH' AND "active" = true;
