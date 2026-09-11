import "server-only";

import dns from "node:dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

// Prefer IPv4 so Neon pooler connections do not stall on broken IPv6 routes.
dns.setDefaultResultOrder("ipv4first");

const PRISMA_ADAPTER_KEY = "pg-ipv4-v5" as const;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  prismaAdapter: typeof PRISMA_ADAPTER_KEY | undefined;
};

/** Detect stale dev HMR clients missing recent Order POS fields. */
function schemaHasPosOrderFields(): boolean {
  return (
    "posUserId" in Prisma.OrderScalarFieldEnum &&
    "posDiscountAmount" in Prisma.OrderScalarFieldEnum
  );
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 30_000,
  });
  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  const existing = globalForPrisma.prisma;
  if (
    existing &&
    globalForPrisma.prismaAdapter === PRISMA_ADAPTER_KEY &&
    schemaHasPosOrderFields() &&
    typeof (existing as { adminNotification?: unknown }).adminNotification !== "undefined" &&
    typeof (existing as { storeConfig?: unknown }).storeConfig !== "undefined" &&
    typeof (existing as { attendancePunch?: unknown }).attendancePunch !== "undefined"
  ) {
    return existing;
  }

  if (existing) {
    void globalForPrisma.pgPool?.end().catch(() => {});
    globalForPrisma.pgPool = undefined;
    globalForPrisma.prisma = undefined;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaAdapter = PRISMA_ADAPTER_KEY;
  }
  return client;
}

export const prisma = getPrismaClient();
