import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma client singleton.
 *
 * Next.js hot-reloads modules in development, which would otherwise create a
 * new PrismaClient (and a new connection pool) on every file save until the
 * database refuses further connections. Caching on globalThis survives reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
