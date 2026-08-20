-- Permanent member discount eligibility for customer accounts
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "memberDiscount" BOOLEAN NOT NULL DEFAULT true;
