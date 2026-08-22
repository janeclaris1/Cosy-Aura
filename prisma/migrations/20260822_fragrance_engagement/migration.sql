-- AlterTable
ALTER TABLE "Fragrance" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Fragrance" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;

-- Seed realistic starting counts for existing products
UPDATE "Fragrance"
SET
  "viewCount" = 120 + floor(random() * 381)::int,
  "likeCount" = 8 + floor(random() * 73)::int
WHERE "viewCount" = 0 AND "likeCount" = 0;
