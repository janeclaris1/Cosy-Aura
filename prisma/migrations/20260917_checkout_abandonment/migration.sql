-- CreateEnum
CREATE TYPE "CheckoutAbandonmentStatus" AS ENUM ('ACTIVE', 'CONVERTED');

-- CreateTable
CREATE TABLE "CheckoutAbandonment" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "status" "CheckoutAbandonmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "items" JSONB NOT NULL,
    "subtotalGhs" DOUBLE PRECISION NOT NULL,
    "displayCurrency" TEXT,
    "shippingCountry" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "checkoutProvider" TEXT,
    "orderId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutAbandonment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutAbandonment_orderId_key" ON "CheckoutAbandonment"("orderId");

-- CreateIndex
CREATE INDEX "CheckoutAbandonment_email_idx" ON "CheckoutAbandonment"("email");

-- CreateIndex
CREATE INDEX "CheckoutAbandonment_status_lastSeenAt_idx" ON "CheckoutAbandonment"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "CheckoutAbandonment_shippingCountry_idx" ON "CheckoutAbandonment"("shippingCountry");

-- CreateIndex
CREATE INDEX "CheckoutAbandonment_lastSeenAt_idx" ON "CheckoutAbandonment"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "CheckoutAbandonment" ADD CONSTRAINT "CheckoutAbandonment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutAbandonment" ADD CONSTRAINT "CheckoutAbandonment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
