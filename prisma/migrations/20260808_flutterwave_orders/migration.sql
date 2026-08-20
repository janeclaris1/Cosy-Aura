ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "flutterwaveTxRef" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_flutterwaveTxRef_key" ON "Order"("flutterwaveTxRef");
