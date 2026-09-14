-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PERFUME', 'WATCH', 'SNEAKER', 'SHIRT', 'SUNGLASSES');

-- AlterTable
ALTER TABLE "Fragrance" ADD COLUMN "productType" "ProductType" NOT NULL DEFAULT 'PERFUME';

-- CreateIndex
CREATE INDEX "Fragrance_productType_idx" ON "Fragrance"("productType");
