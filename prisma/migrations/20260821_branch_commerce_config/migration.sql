-- Phase 3: branch commerce config (WhatsApp, COD, couriers, pickup, hours)

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "whatsappPhone" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "codEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "pickupEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "dawuroboEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "shaqexpressEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "openingHours" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "deliveryNotes" TEXT;
