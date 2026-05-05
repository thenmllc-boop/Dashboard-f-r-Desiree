import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Lazy Prisma client. We avoid eagerly instantiating it at module-load
 * time so that build environments without DATABASE_URL (e.g. Vercel
 * production build before env wiring) don't crash with
 * PrismaClientInitializationError. The client is constructed on first
 * access from a Server Component or API route, by which point env vars
 * are available at runtime.
 */
function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient();
    }
    // @ts-expect-error – dynamic forwarding
    return globalForPrisma.prisma[prop];
  },
});
