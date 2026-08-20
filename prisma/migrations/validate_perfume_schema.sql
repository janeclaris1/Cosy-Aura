-- Validation queries after perfume migration
-- Run: psql "$DATABASE_URL" -f prisma/migrations/validate_perfume_schema.sql

-- 1. Table rename succeeded
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('Fragrance', 'FragranceImage', 'Watch', 'WatchImage')
ORDER BY table_name;
-- Expect: Fragrance, FragranceImage (no Watch / WatchImage)

-- 2. Required perfume columns exist
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'Fragrance'
  AND column_name IN (
    'fragranceFamily', 'bottleMaterial', 'bottleSize', 'capType',
    'liquidColor', 'longevity', 'bottleShape', 'concentration',
    'topNotes', 'heartNotes', 'baseNotes', 'sillage',
    'sustainabilityScore', 'isVegan', 'isCrueltyFree', 'sampleAvailable'
  )
ORDER BY column_name;
-- Expect: 16 rows

-- 3. Old watch columns gone
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Fragrance'
  AND column_name IN (
    'movement', 'caseMaterial', 'caseSize', 'strapMaterial',
    'dial', 'waterResistance', 'hasBox', 'hasPapers'
  );
-- Expect: 0 rows

-- 4. FK columns renamed
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name IN ('fragranceId', 'watchId')
  AND table_name IN ('FragranceImage', 'OrderItem', 'WishlistItem')
ORDER BY table_name, column_name;
-- Expect: fragranceId only

-- 5. No nulls in required remapped fields
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE "fragranceFamily" IS NULL) AS null_family,
  COUNT(*) FILTER (WHERE "bottleMaterial" IS NULL) AS null_material,
  COUNT(*) FILTER (WHERE "capType" IS NULL) AS null_cap,
  COUNT(*) FILTER (WHERE "bottleSize" IS NULL) AS null_size
FROM "Fragrance";
-- Expect: all null_* = 0

-- 6. bottleSize is perfume-typical
SELECT "bottleSize", COUNT(*)
FROM "Fragrance"
GROUP BY "bottleSize"
ORDER BY "bottleSize";
-- Expect: 30, 50, 100, and/or 200 only

-- 7. Enum distributions
SELECT "fragranceFamily"::text, COUNT(*) FROM "Fragrance" GROUP BY 1 ORDER BY 2 DESC;
SELECT "concentration"::text, COUNT(*) FROM "Fragrance" GROUP BY 1 ORDER BY 2 DESC;
SELECT "sillage"::text, COUNT(*) FROM "Fragrance" GROUP BY 1 ORDER BY 2 DESC;

-- 8. Orders / wishlist still linked
SELECT COUNT(*) AS order_items FROM "OrderItem";
SELECT COUNT(*) AS orphan_order_items
FROM "OrderItem" oi
LEFT JOIN "Fragrance" f ON f.id = oi."fragranceId"
WHERE f.id IS NULL;
-- Expect: orphan_order_items = 0

SELECT COUNT(*) AS orphan_wishlist
FROM "WishlistItem" w
LEFT JOIN "Fragrance" f ON f.id = w."fragranceId"
WHERE f.id IS NULL;
-- Expect: 0

-- 9. Image integrity
SELECT COUNT(*) AS images FROM "FragranceImage";
SELECT COUNT(*) AS orphan_images
FROM "FragranceImage" i
LEFT JOIN "Fragrance" f ON f.id = i."fragranceId"
WHERE f.id IS NULL;
-- Expect: 0
