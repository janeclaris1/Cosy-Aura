-- AlterTable
ALTER TABLE "Order" ADD COLUMN "commissionEmployeeId" TEXT;

-- CreateIndex
CREATE INDEX "Order_commissionEmployeeId_idx" ON "Order"("commissionEmployeeId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_commissionEmployeeId_fkey" FOREIGN KEY ("commissionEmployeeId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
