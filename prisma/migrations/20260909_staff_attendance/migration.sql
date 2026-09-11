-- Staff attendance: biometric devices, enrollments, punches

CREATE TYPE "AttendancePunchType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');
CREATE TYPE "AttendanceSource" AS ENUM ('BIOMETRIC', 'MANUAL', 'WEBHOOK');

CREATE TABLE "AttendanceDevice" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "serialNumber" TEXT,
    "webhookSecretHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceUserId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendancePunch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "deviceId" TEXT,
    "punchType" "AttendancePunchType" NOT NULL,
    "source" "AttendanceSource" NOT NULL DEFAULT 'BIOMETRIC',
    "punchedAt" TIMESTAMP(3) NOT NULL,
    "externalId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceDevice_serialNumber_key" ON "AttendanceDevice"("serialNumber");
CREATE INDEX "AttendanceDevice_branchId_idx" ON "AttendanceDevice"("branchId");
CREATE INDEX "AttendanceDevice_active_idx" ON "AttendanceDevice"("active");

CREATE UNIQUE INDEX "AttendanceEnrollment_deviceId_deviceUserId_key" ON "AttendanceEnrollment"("deviceId", "deviceUserId");
CREATE UNIQUE INDEX "AttendanceEnrollment_userId_deviceId_key" ON "AttendanceEnrollment"("userId", "deviceId");
CREATE INDEX "AttendanceEnrollment_userId_idx" ON "AttendanceEnrollment"("userId");
CREATE INDEX "AttendanceEnrollment_deviceId_idx" ON "AttendanceEnrollment"("deviceId");

CREATE UNIQUE INDEX "AttendancePunch_deviceId_externalId_key" ON "AttendancePunch"("deviceId", "externalId");
CREATE INDEX "AttendancePunch_userId_punchedAt_idx" ON "AttendancePunch"("userId", "punchedAt");
CREATE INDEX "AttendancePunch_branchId_punchedAt_idx" ON "AttendancePunch"("branchId", "punchedAt");
CREATE INDEX "AttendancePunch_punchedAt_idx" ON "AttendancePunch"("punchedAt");
CREATE INDEX "AttendancePunch_deviceId_idx" ON "AttendancePunch"("deviceId");

ALTER TABLE "AttendanceDevice" ADD CONSTRAINT "AttendanceDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceEnrollment" ADD CONSTRAINT "AttendanceEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceEnrollment" ADD CONSTRAINT "AttendanceEnrollment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AttendanceDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AttendancePunch" ADD CONSTRAINT "AttendancePunch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
