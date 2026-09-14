-- Staff sales commissions on POS orders by scent family

CREATE TYPE "StaffCommissionStatus" AS ENUM ('EARNED', 'VOIDED', 'PAID');

CREATE TABLE "CommissionCategoryRule" (
    "id" TEXT NOT NULL,
    "fragranceFamily" "FragranceFamily" NOT NULL,
    "ratePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionCategoryRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffCommissionEntry" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "fragranceFamily" "FragranceFamily" NOT NULL,
    "productLabel" TEXT NOT NULL,
    "lineTotalGhs" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionGhs" DOUBLE PRECISION NOT NULL,
    "status" "StaffCommissionStatus" NOT NULL DEFAULT 'EARNED',
    "payRunLineId" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCommissionEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommissionCategoryRule_fragranceFamily_country_key" ON "CommissionCategoryRule"("fragranceFamily", "country");
CREATE INDEX "CommissionCategoryRule_active_idx" ON "CommissionCategoryRule"("active");

CREATE UNIQUE INDEX "StaffCommissionEntry_orderItemId_key" ON "StaffCommissionEntry"("orderItemId");
CREATE INDEX "StaffCommissionEntry_staffUserId_status_earnedAt_idx" ON "StaffCommissionEntry"("staffUserId", "status", "earnedAt");
CREATE INDEX "StaffCommissionEntry_orderId_idx" ON "StaffCommissionEntry"("orderId");
CREATE INDEX "StaffCommissionEntry_branchId_idx" ON "StaffCommissionEntry"("branchId");
CREATE INDEX "StaffCommissionEntry_payRunLineId_idx" ON "StaffCommissionEntry"("payRunLineId");

ALTER TABLE "StaffCommissionEntry" ADD CONSTRAINT "StaffCommissionEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffCommissionEntry" ADD CONSTRAINT "StaffCommissionEntry_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffCommissionEntry" ADD CONSTRAINT "StaffCommissionEntry_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffCommissionEntry" ADD CONSTRAINT "StaffCommissionEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffCommissionEntry" ADD CONSTRAINT "StaffCommissionEntry_payRunLineId_fkey" FOREIGN KEY ("payRunLineId") REFERENCES "PayRunLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
