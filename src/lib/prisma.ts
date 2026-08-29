import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to access PostgreSQL.");
  }

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    max: 5,
  });

  if (process.env.VERCEL) {
    attachDatabasePool(pool);
  }

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export function getPrisma() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
