-- Per-country fragrance availability (Ghana / Cameroon shops)
CREATE TABLE IF NOT EXISTS "FragranceCountryStock" (
    "id" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FragranceCountryStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FragranceCountryStock_fragranceId_country_key"
  ON "FragranceCountryStock"("fragranceId", "country");

CREATE INDEX IF NOT EXISTS "FragranceCountryStock_country_inStock_idx"
  ON "FragranceCountryStock"("country", "inStock");

CREATE INDEX IF NOT EXISTS "FragranceCountryStock_fragranceId_idx"
  ON "FragranceCountryStock"("fragranceId");

DO $$ BEGIN
  ALTER TABLE "FragranceCountryStock"
    ADD CONSTRAINT "FragranceCountryStock_fragranceId_fkey"
    FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Seed GH + CM rows from current global stock for existing products
INSERT INTO "FragranceCountryStock" ("id", "fragranceId", "country", "inStock", "createdAt", "updatedAt")
SELECT
  md5(f."id" || '-GH'),
  f."id",
  'GH',
  (f."stock" > 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Fragrance" f
ON CONFLICT ("fragranceId", "country") DO NOTHING;

INSERT INTO "FragranceCountryStock" ("id", "fragranceId", "country", "inStock", "createdAt", "updatedAt")
SELECT
  md5(f."id" || '-CM'),
  f."id",
  'CM',
  (f."stock" > 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Fragrance" f
ON CONFLICT ("fragranceId", "country") DO NOTHING;
