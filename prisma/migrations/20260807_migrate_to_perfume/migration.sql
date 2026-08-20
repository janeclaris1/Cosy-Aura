-- ============================================================================
-- Cosy Aura: Watch → Fragrance migration (Neon PostgreSQL)
-- Run AFTER backup. Idempotent-safe where noted.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 0. Backups (same transaction; also run scripts/backup-db.sh beforehand)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_backup_Watch" AS SELECT * FROM "Watch";
CREATE TABLE IF NOT EXISTS "_backup_WatchImage" AS SELECT * FROM "WatchImage";
CREATE TABLE IF NOT EXISTS "_backup_OrderItem" AS SELECT * FROM "OrderItem";
CREATE TABLE IF NOT EXISTS "_backup_WishlistItem" AS SELECT * FROM "WishlistItem";

-- --------------------------------------------------------------------------
-- 1. New enums
-- --------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "FragranceFamily" AS ENUM ('FLORAL', 'ORIENTAL', 'WOODY', 'FRESH', 'CITRUS', 'SPICY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BottleMaterial" AS ENUM ('GLASS', 'CRYSTAL', 'METAL', 'CERAMIC', 'ACRYLIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CapType" AS ENUM ('MAGNETIC', 'SPRAY', 'DAB_ON', 'SCREW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Concentration" AS ENUM ('EDT', 'EDP', 'PARFUM', 'EXTRAIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Sillage" AS ENUM ('SUBTLE', 'MODERATE', 'INTENSE', 'POWERFUL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------------
-- 2. Rename tables
-- --------------------------------------------------------------------------
ALTER TABLE IF EXISTS "Watch" RENAME TO "Fragrance";
ALTER TABLE IF EXISTS "WatchImage" RENAME TO "FragranceImage";

-- --------------------------------------------------------------------------
-- 3. Rename FK columns on related tables
-- --------------------------------------------------------------------------
ALTER TABLE "FragranceImage" RENAME COLUMN "watchId" TO "fragranceId";
ALTER TABLE "OrderItem" RENAME COLUMN "watchId" TO "fragranceId";
ALTER TABLE "WishlistItem" RENAME COLUMN "watchId" TO "fragranceId";

-- Rename unique constraint on wishlist if present
ALTER INDEX IF EXISTS "WishlistItem_userId_watchId_key" RENAME TO "WishlistItem_userId_fragranceId_key";

-- --------------------------------------------------------------------------
-- 4. Add new perfume columns (nullable first, then backfill)
-- --------------------------------------------------------------------------
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "fragranceFamily" "FragranceFamily";
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "bottleMaterial" "BottleMaterial";
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "bottleSize" INTEGER;
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "capType" "CapType";
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "liquidColor" TEXT;
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "longevity" TEXT;
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "bottleShape" TEXT;
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "concentration" "Concentration" DEFAULT 'EDP';
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "topNotes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "heartNotes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "baseNotes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "sillage" "Sillage" DEFAULT 'MODERATE';
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "sustainabilityScore" INTEGER DEFAULT 3;
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "isVegan" BOOLEAN DEFAULT false;
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "isCrueltyFree" BOOLEAN DEFAULT true;
ALTER TABLE "Fragrance" ADD COLUMN IF NOT EXISTS "sampleAvailable" BOOLEAN DEFAULT false;

-- --------------------------------------------------------------------------
-- 5. Backfill from watch columns (field mapping)
-- --------------------------------------------------------------------------
UPDATE "Fragrance" SET
  "fragranceFamily" = CASE "movement"::text
    WHEN 'AUTOMATIC' THEN 'WOODY'::"FragranceFamily"
    WHEN 'MANUAL'    THEN 'ORIENTAL'::"FragranceFamily"
    WHEN 'QUARTZ'    THEN 'FRESH'::"FragranceFamily"
    ELSE 'WOODY'::"FragranceFamily"
  END,
  "bottleMaterial" = CASE "caseMaterial"::text
    WHEN 'STEEL'     THEN 'GLASS'::"BottleMaterial"
    WHEN 'GOLD'      THEN 'CRYSTAL'::"BottleMaterial"
    WHEN 'PLATINUM'  THEN 'CRYSTAL'::"BottleMaterial"
    WHEN 'TWO_TONE'  THEN 'METAL'::"BottleMaterial"
    WHEN 'TITANIUM'  THEN 'METAL'::"BottleMaterial"
    WHEN 'CERAMIC'   THEN 'CERAMIC'::"BottleMaterial"
    ELSE 'GLASS'::"BottleMaterial"
  END,
  "capType" = CASE "strapMaterial"::text
    WHEN 'METAL'   THEN 'SPRAY'::"CapType"
    WHEN 'LEATHER' THEN 'SCREW'::"CapType"
    WHEN 'RUBBER'  THEN 'MAGNETIC'::"CapType"
    WHEN 'FABRIC'  THEN 'DAB_ON'::"CapType"
    ELSE 'SPRAY'::"CapType"
  END,
  "bottleSize" = COALESCE(
    NULLIF(regexp_replace(COALESCE("caseSize", ''), '[^0-9]', '', 'g'), '')::INTEGER,
    100
  ),
  "liquidColor" = "dial",
  "longevity" = CASE
    WHEN "waterResistance" ILIKE '%300%' OR "waterResistance" ILIKE '%200%' THEN '8-10hrs'
    WHEN "waterResistance" ILIKE '%100%' OR "waterResistance" ILIKE '%50%' THEN '6-8hrs'
    ELSE '4-6hrs'
  END,
  "bottleShape" = 'Round',
  "concentration" = COALESCE("concentration", 'EDP'::"Concentration"),
  "sillage" = COALESCE("sillage", 'MODERATE'::"Sillage"),
  "sustainabilityScore" = COALESCE("sustainabilityScore", 3),
  "isVegan" = COALESCE("isVegan", false),
  "isCrueltyFree" = COALESCE("hasPapers", true),
  "sampleAvailable" = COALESCE("hasBox", false),
  "topNotes" = COALESCE("topNotes", ARRAY[]::TEXT[]),
  "heartNotes" = COALESCE("heartNotes", ARRAY[]::TEXT[]),
  "baseNotes" = COALESCE("baseNotes", ARRAY[]::TEXT[])
WHERE "fragranceFamily" IS NULL
   OR "bottleMaterial" IS NULL
   OR "capType" IS NULL
   OR "bottleSize" IS NULL;

-- Clamp bottleSize to perfume-typical values
UPDATE "Fragrance" SET "bottleSize" = CASE
  WHEN "bottleSize" <= 30 THEN 30
  WHEN "bottleSize" <= 50 THEN 50
  WHEN "bottleSize" <= 100 THEN 100
  ELSE 200
END;

-- --------------------------------------------------------------------------
-- 6. Enforce NOT NULL on remapped columns
-- --------------------------------------------------------------------------
ALTER TABLE "Fragrance" ALTER COLUMN "fragranceFamily" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "bottleMaterial" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "bottleSize" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "bottleSize" SET DEFAULT 100;
ALTER TABLE "Fragrance" ALTER COLUMN "capType" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "concentration" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "sillage" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "sustainabilityScore" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "isVegan" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "isCrueltyFree" SET NOT NULL;
ALTER TABLE "Fragrance" ALTER COLUMN "sampleAvailable" SET NOT NULL;

-- --------------------------------------------------------------------------
-- 7. Drop old watch columns
-- --------------------------------------------------------------------------
ALTER TABLE "Fragrance" DROP COLUMN IF EXISTS "movement";
ALTER TABLE "Fragrance" DROP COLUMN IF EXISTS "caseMaterial";
ALTER TABLE "Fragrance" DROP COLUMN IF EXISTS "caseSize";
ALTER TABLE "Fragrance" DROP COLUMN IF EXISTS "strapMaterial";
ALTER TABLE "Fragrance" DROP COLUMN IF EXISTS "dial";
ALTER TABLE "Fragrance" DROP COLUMN IF EXISTS "waterResistance";
ALTER TABLE "Fragrance" DROP COLUMN IF EXISTS "hasBox";
ALTER TABLE "Fragrance" DROP COLUMN IF EXISTS "hasPapers";

-- --------------------------------------------------------------------------
-- 8. Drop obsolete enums (CASCADE: _backup_* tables may still reference them)
-- --------------------------------------------------------------------------
DROP TYPE IF EXISTS "Movement" CASCADE;
DROP TYPE IF EXISTS "CaseMaterial" CASCADE;
DROP TYPE IF EXISTS "StrapMaterial" CASCADE;

-- --------------------------------------------------------------------------
-- 9. Indexes (create missing; rename legacy names when free)
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Fragrance_fragranceFamily_idx" ON "Fragrance"("fragranceFamily");
CREATE INDEX IF NOT EXISTS "Fragrance_concentration_idx" ON "Fragrance"("concentration");

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_brandId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_brandId_idx') THEN
    ALTER INDEX "Watch_brandId_idx" RENAME TO "Fragrance_brandId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_seriesId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_seriesId_idx') THEN
    ALTER INDEX "Watch_seriesId_idx" RENAME TO "Fragrance_seriesId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_slug_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_slug_idx') THEN
    ALTER INDEX "Watch_slug_idx" RENAME TO "Fragrance_slug_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_condition_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_condition_idx') THEN
    ALTER INDEX "Watch_condition_idx" RENAME TO "Fragrance_condition_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_price_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_price_idx') THEN
    ALTER INDEX "Watch_price_idx" RENAME TO "Fragrance_price_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_createdAt_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_createdAt_idx') THEN
    ALTER INDEX "Watch_createdAt_idx" RENAME TO "Fragrance_createdAt_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_featured_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_featured_idx') THEN
    ALTER INDEX "Watch_featured_idx" RENAME TO "Fragrance_featured_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_slug_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_slug_key') THEN
    ALTER INDEX "Watch_slug_key" RENAME TO "Fragrance_slug_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Watch_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'Fragrance_pkey') THEN
    ALTER INDEX "Watch_pkey" RENAME TO "Fragrance_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'WatchImage_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'FragranceImage_pkey') THEN
    ALTER INDEX "WatchImage_pkey" RENAME TO "FragranceImage_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'WatchImage_watchId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'FragranceImage_fragranceId_idx') THEN
    ALTER INDEX "WatchImage_watchId_idx" RENAME TO "FragranceImage_fragranceId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'OrderItem_watchId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'OrderItem_fragranceId_idx') THEN
    ALTER INDEX "OrderItem_watchId_idx" RENAME TO "OrderItem_fragranceId_idx";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FragranceImage_fragranceId_idx" ON "FragranceImage"("fragranceId");
CREATE INDEX IF NOT EXISTS "OrderItem_fragranceId_idx" ON "OrderItem"("fragranceId");

COMMIT;
