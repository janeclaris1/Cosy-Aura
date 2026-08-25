-- AlterTable
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
