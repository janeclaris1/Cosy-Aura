-- Paystack checkout + optional delivery phone
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paystackReference" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_paystackReference_key" ON "Order"("paystackReference");
CREATE INDEX IF NOT EXISTS "Order_paymentProvider_idx" ON "Order"("paymentProvider");
