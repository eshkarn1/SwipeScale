/**
 * Prisma client singleton.
 *
 * Prisma 7's `prisma-client` generator (see `prisma/schema.prisma`) needs a
 * driver adapter rather than dialing a connection string itself, so this is
 * the one place `@prisma/adapter-pg` and `DATABASE_URL` meet.
 *
 * Standard Next.js dev-mode singleton: the App Router hot-reloads modules,
 * so without stashing the client on `globalThis` every edit would open a new
 * connection pool until Postgres refused the next one.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in " +
        "— see docs/local-database.md for the local Postgres setup.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
