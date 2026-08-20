-- Capture phone / WhatsApp on member signup
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");

ALTER TABLE "NewsletterSubscriber" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_phone_idx" ON "NewsletterSubscriber"("phone");
