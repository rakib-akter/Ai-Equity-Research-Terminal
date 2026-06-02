/**
 * Prisma client singleton. In dev, Next.js hot-reload re-imports modules, so we
 * cache the client on globalThis to avoid exhausting the connection pool.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
