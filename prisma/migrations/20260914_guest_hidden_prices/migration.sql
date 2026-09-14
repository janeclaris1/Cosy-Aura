-- Hide catalog prices from guests (per product type, excludes perfumes by convention)
ALTER TABLE "StoreConfig" ADD COLUMN "guestHiddenPriceCatalogs" JSONB NOT NULL DEFAULT '[]';
