-- CreateTable
CREATE TABLE "FragranceReview" (
    "id" TEXT NOT NULL,
    "fragranceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FragranceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FragranceReview_fragranceId_orderId_key" ON "FragranceReview"("fragranceId", "orderId");

-- CreateIndex
CREATE INDEX "FragranceReview_fragranceId_createdAt_idx" ON "FragranceReview"("fragranceId", "createdAt");

-- CreateIndex
CREATE INDEX "FragranceReview_orderId_idx" ON "FragranceReview"("orderId");

-- CreateIndex
CREATE INDEX "FragranceReview_userId_idx" ON "FragranceReview"("userId");

-- AddForeignKey
ALTER TABLE "FragranceReview" ADD CONSTRAINT "FragranceReview_fragranceId_fkey" FOREIGN KEY ("fragranceId") REFERENCES "Fragrance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceReview" ADD CONSTRAINT "FragranceReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceReview" ADD CONSTRAINT "FragranceReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
