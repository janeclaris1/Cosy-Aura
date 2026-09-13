import dns from "node:dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

/** Neon pooler often fails from CLI on IPv6 — match src/lib/prisma.ts. */
dns.setDefaultResultOrder("ipv4first");

export function createScriptPrisma(): {
  prisma: PrismaClient;
  pool: Pool;
  disconnect: () => Promise<void>;
} {
  const connectionString =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL (or DIRECT_URL) in .env — cannot connect to the database."
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ||
      connectionString.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
    max: 5,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 10_000,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: ["error"],
  });

  return {
    prisma,
    pool,
    disconnect: async () => {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}
