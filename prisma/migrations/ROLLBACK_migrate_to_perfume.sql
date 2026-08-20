-- ============================================================================
-- ROLLBACK: Fragrance → Watch
-- Prefer restoring from pg_dump / scripts/backup-db.sh if available.
-- This script reverses the forward migration using _backup_* tables when present.
-- ============================================================================

BEGIN;

-- If full backups exist, restore from them (safest path)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_Watch') THEN
    -- Drop perfume tables if renamed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Fragrance') THEN
      -- Clear FKs that point at Fragrance
      TRUNCATE TABLE "WishlistItem", "OrderItem" CASCADE;
      DROP TABLE IF EXISTS "FragranceImage" CASCADE;
      DROP TABLE IF EXISTS "Fragrance" CASCADE;
    END IF;

    CREATE TABLE "Watch" AS SELECT * FROM "_backup_Watch";
    -- Recreate PK / indexes will require prisma db push after restore
    CREATE TABLE "WatchImage" AS SELECT * FROM "_backup_WatchImage";

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_OrderItem') THEN
      DELETE FROM "OrderItem";
      INSERT INTO "OrderItem" SELECT * FROM "_backup_OrderItem";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_WishlistItem') THEN
      DELETE FROM "WishlistItem";
      INSERT INTO "WishlistItem" SELECT * FROM "_backup_WishlistItem";
    END IF;
  END IF;
END $$;

-- Manual reverse path when backups are column-level only (no full table restore)
-- Uncomment and adapt if you did NOT use _backup_* tables:

/*
-- Recreate old enums
CREATE TYPE "Movement" AS ENUM ('AUTOMATIC', 'MANUAL', 'QUARTZ');
CREATE TYPE "CaseMaterial" AS ENUM ('STEEL', 'GOLD', 'PLATINUM', 'TWO_TONE', 'TITANIUM', 'CERAMIC');
CREATE TYPE "StrapMaterial" AS ENUM ('METAL', 'LEATHER', 'RUBBER', 'FABRIC');

ALTER TABLE "Fragrance" RENAME TO "Watch";
ALTER TABLE "FragranceImage" RENAME TO "WatchImage";
ALTER TABLE "WatchImage" RENAME COLUMN "fragranceId" TO "watchId";
ALTER TABLE "OrderItem" RENAME COLUMN "fragranceId" TO "watchId";
ALTER TABLE "WishlistItem" RENAME COLUMN "fragranceId" TO "watchId";

ALTER TABLE "Watch" ADD COLUMN "movement" "Movement";
ALTER TABLE "Watch" ADD COLUMN "caseMaterial" "CaseMaterial";
ALTER TABLE "Watch" ADD COLUMN "caseSize" TEXT;
ALTER TABLE "Watch" ADD COLUMN "strapMaterial" "StrapMaterial";
ALTER TABLE "Watch" ADD COLUMN "dial" TEXT;
ALTER TABLE "Watch" ADD COLUMN "waterResistance" TEXT;
ALTER TABLE "Watch" ADD COLUMN "hasBox" BOOLEAN DEFAULT false;
ALTER TABLE "Watch" ADD COLUMN "hasPapers" BOOLEAN DEFAULT false;

UPDATE "Watch" SET
  "movement" = CASE "fragranceFamily"::text
    WHEN 'WOODY' THEN 'AUTOMATIC'::"Movement"
    WHEN 'ORIENTAL' THEN 'MANUAL'::"Movement"
    WHEN 'FRESH' THEN 'QUARTZ'::"Movement"
    ELSE 'AUTOMATIC'::"Movement"
  END,
  "caseMaterial" = CASE "bottleMaterial"::text
    WHEN 'GLASS' THEN 'STEEL'::"CaseMaterial"
    WHEN 'CRYSTAL' THEN 'GOLD'::"CaseMaterial"
    WHEN 'METAL' THEN 'TITANIUM'::"CaseMaterial"
    WHEN 'CERAMIC' THEN 'CERAMIC'::"CaseMaterial"
    ELSE 'STEEL'::"CaseMaterial"
  END,
  "strapMaterial" = CASE "capType"::text
    WHEN 'SPRAY' THEN 'METAL'::"StrapMaterial"
    WHEN 'SCREW' THEN 'LEATHER'::"StrapMaterial"
    WHEN 'MAGNETIC' THEN 'RUBBER'::"StrapMaterial"
    WHEN 'DAB_ON' THEN 'FABRIC'::"StrapMaterial"
    ELSE 'METAL'::"StrapMaterial"
  END,
  "caseSize" = "bottleSize"::text || 'mm',
  "dial" = "liquidColor",
  "waterResistance" = "longevity",
  "hasBox" = "sampleAvailable",
  "hasPapers" = "isCrueltyFree";

ALTER TABLE "Watch" ALTER COLUMN "movement" SET NOT NULL;
ALTER TABLE "Watch" ALTER COLUMN "caseMaterial" SET NOT NULL;
ALTER TABLE "Watch" ALTER COLUMN "strapMaterial" SET NOT NULL;

ALTER TABLE "Watch" DROP COLUMN IF EXISTS "fragranceFamily";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "bottleMaterial";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "bottleSize";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "capType";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "liquidColor";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "longevity";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "bottleShape";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "concentration";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "topNotes";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "heartNotes";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "baseNotes";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "sillage";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "sustainabilityScore";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "isVegan";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "isCrueltyFree";
ALTER TABLE "Watch" DROP COLUMN IF EXISTS "sampleAvailable";

DROP TYPE IF EXISTS "FragranceFamily";
DROP TYPE IF EXISTS "BottleMaterial";
DROP TYPE IF EXISTS "CapType";
DROP TYPE IF EXISTS "Concentration";
DROP TYPE IF EXISTS "Sillage";
*/

COMMIT;

-- After rollback, restore watch schema.prisma from git and run:
--   git checkout main -- prisma/schema.prisma
--   npx prisma generate
--   npx prisma db push
