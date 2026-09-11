-- POS order-level discount
CREATE TYPE "PosDiscountType" AS ENUM ('PERCENT', 'FIXED');

ALTER TABLE "Order" ADD COLUMN "posDiscountType" "PosDiscountType";
ALTER TABLE "Order" ADD COLUMN "posDiscountValue" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN "posDiscountAmount" DOUBLE PRECISION;
