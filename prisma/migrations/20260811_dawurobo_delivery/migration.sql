-- Dawurobo Ghana delivery fields
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLat" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryLng" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dawuroboOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dawuroboPayer" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_dawuroboOrderId_key" ON "Order"("dawuroboOrderId");
CREATE INDEX IF NOT EXISTS "Order_dawuroboPayer_idx" ON "Order"("dawuroboPayer");
