import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Shared Prisma client.
 *
 * Local dev uses SQLite (file:.) via DATABASE_URL — e.g.
 * `file:./prisma/dev.db`. Production / Vercel uses PostgreSQL
 * (Neon / Supabase / any Postgres) via DATABASE_URL. The client is
 * created lazily so `next build` (which runs with dummy env) succeeds;
 * the first real query throws a clear error if DATABASE_URL is missing
 * instead of crashing at import time.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in a database connection string."
    );
  }
  // SQLite for local dev (file:.), PostgreSQL for production (postgresql://).
  const adapter = connectionString.startsWith("file:")
    ? new PrismaBetterSqlite3({ url: connectionString })
    : new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      const client = (globalForPrisma.prisma ??= createClient());
      const value = Reflect.get(client, prop, receiver);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });

if (process.env.NODE_ENV !== "production") {
  // Eagerly assign in dev so HMR reuses one client; in production each
  // invocation gets a lazily-created client via the proxy above.
  if (!globalForPrisma.prisma && process.env.DATABASE_URL) {
    globalForPrisma.prisma = createClient();
  }
}