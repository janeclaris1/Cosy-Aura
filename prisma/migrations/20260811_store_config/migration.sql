-- StoreConfig singleton for admin-controlled pricing rules
CREATE TABLE "StoreConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nonAfricaMarkupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "nonAfricaMarkupUsd" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "StoreConfig" ("id", "nonAfricaMarkupEnabled", "nonAfricaMarkupUsd", "updatedAt")
VALUES ('default', false, 10, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
