-- Phase 8: audit IP/UA + admin password tokens

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

CREATE TABLE IF NOT EXISTS "AdminPasswordToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPasswordToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminPasswordToken_tokenHash_key" ON "AdminPasswordToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "AdminPasswordToken_userId_idx" ON "AdminPasswordToken"("userId");
CREATE INDEX IF NOT EXISTS "AdminPasswordToken_expiresAt_idx" ON "AdminPasswordToken"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "AdminPasswordToken"
    ADD CONSTRAINT "AdminPasswordToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
