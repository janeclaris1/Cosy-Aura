-- Hybrid Ghana delivery: Dawurobo (Greater Accra) + ShaQ Express (nationwide)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingRegion" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingRegionId" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryProvider" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shaqexpressTrackingNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_shaqexpressTrackingNumber_key"
  ON "Order"("shaqexpressTrackingNumber");

CREATE INDEX IF NOT EXISTS "Order_deliveryProvider_idx" ON "Order"("deliveryProvider");
CREATE INDEX IF NOT EXISTS "Order_shippingRegion_idx" ON "Order"("shippingRegion");
