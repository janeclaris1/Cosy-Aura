-- CreateEnum
CREATE TYPE "HrDocumentCategory" AS ENUM ('OFFER_LETTER', 'EMPLOYMENT_CONTRACT', 'DISCIPLINARY_WARNING', 'FINAL_WRITTEN_WARNING', 'ONBOARDING_CHECKLIST', 'OFFBOARDING_CHECKLIST');

-- CreateEnum
CREATE TYPE "HrDocumentTemplateKind" AS ENUM ('LETTER', 'CHECKLIST');

-- CreateTable
CREATE TABLE "HrDocumentTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "HrDocumentCategory" NOT NULL,
    "kind" "HrDocumentTemplateKind" NOT NULL DEFAULT 'LETTER',
    "country" TEXT NOT NULL DEFAULT 'GH',
    "staffRole" "StaffRole",
    "employmentType" "EmploymentType",
    "body" TEXT NOT NULL,
    "checklistItems" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrDocumentInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "renderedBody" TEXT NOT NULL,
    "mergeData" JSONB,
    "checklistProgress" JSONB,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrDocumentInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HrDocumentTemplate_slug_key" ON "HrDocumentTemplate"("slug");

-- CreateIndex
CREATE INDEX "HrDocumentTemplate_category_country_active_idx" ON "HrDocumentTemplate"("category", "country", "active");

-- CreateIndex
CREATE INDEX "HrDocumentTemplate_staffRole_idx" ON "HrDocumentTemplate"("staffRole");

-- CreateIndex
CREATE INDEX "HrDocumentInstance_employeeId_idx" ON "HrDocumentInstance"("employeeId");

-- CreateIndex
CREATE INDEX "HrDocumentInstance_templateId_idx" ON "HrDocumentInstance"("templateId");

-- CreateIndex
CREATE INDEX "HrDocumentInstance_generatedAt_idx" ON "HrDocumentInstance"("generatedAt");

-- AddForeignKey
ALTER TABLE "HrDocumentTemplate" ADD CONSTRAINT "HrDocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocumentInstance" ADD CONSTRAINT "HrDocumentInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HrDocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocumentInstance" ADD CONSTRAINT "HrDocumentInstance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocumentInstance" ADD CONSTRAINT "HrDocumentInstance_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
