-- WhatsApp checkout: admin toggle + per-country numbers
ALTER TABLE "StoreConfig"
  ADD COLUMN IF NOT EXISTS "whatsappCheckoutEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "StoreConfig"
  ADD COLUMN IF NOT EXISTS "whatsappCheckoutNumbers" JSONB NOT NULL DEFAULT '{}';
