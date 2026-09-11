-- POS system: barcodes, walk-in order channel, receipt fields

CREATE TYPE "OrderChannel" AS ENUM ('WEB', 'POS');
CREATE TYPE "PosPaymentMethod" AS ENUM ('CASH', 'MOMO', 'CARD', 'OTHER');

CREATE TABLE "FragranceBarcode" (
    "id" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "bottleSize" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FragranceBarcode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FragranceBarcode_barcode_key" ON "FragranceBarcode"("barcode");
CREATE UNIQUE INDEX "FragranceBarcode_fragranceId_bottleSize_key" ON "FragranceBarcode"("fragranceId", "bottleSize");
CREATE INDEX "FragranceBarcode_fragranceId_idx" ON "FragranceBarcode"("fragranceId");
CREATE INDEX "FragranceBarcode_barcode_idx" ON "FragranceBarcode"("barcode");

ALTER TABLE "FragranceBarcode" ADD CONSTRAINT "FragranceBarcode_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "channel" "OrderChannel" NOT NULL DEFAULT 'WEB';
ALTER TABLE "Order" ADD COLUMN "posUserId" TEXT;
ALTER TABLE "Order" ADD COLUMN "posPaymentMethod" "PosPaymentMethod";
ALTER TABLE "Order" ADD COLUMN "receiptNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "posNotes" TEXT;

CREATE UNIQUE INDEX "Order_receiptNumber_key" ON "Order"("receiptNumber");
CREATE INDEX "Order_channel_idx" ON "Order"("channel");
CREATE INDEX "Order_posUserId_idx" ON "Order"("posUserId");
CREATE INDEX "Order_receiptNumber_idx" ON "Order"("receiptNumber");

ALTER TABLE "Order" ADD CONSTRAINT "Order_posUserId_fkey" FOREIGN KEY ("posUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
