/**
 * Clears the auth rate-limit buckets in the E2E database before a run.
 *
 * BUILD_SPEC §8 caps auth endpoints at 5 attempts / 15 min / IP, implemented
 * as a Postgres fixed-window counter (DECISIONS §9.4). Every E2E run signs
 * up at least one fresh user from localhost, so the limiter sees one IP
 * making every request in the suite — after two or three runs inside a
 * fifteen-minute window the next `/login` silently stops sending, and the
 * suite fails at "expected /verify, got /login" with nothing in the trace
 * to say why. That is the rate limiter working correctly; it just makes the
 * suite unrunnable without this reset.
 *
 * Scoped to `RateLimitBucket` on purpose. It does NOT truncate users,
 * workspaces or records: every test already namespaces its own data with a
 * run id, and a setup step that wipes the database would hide a test that
 * accidentally depends on another test's rows.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";

import { E2E_DATABASE_URL } from "./database";

export default async function globalSetup() {
  const adapter = new PrismaPg({ connectionString: E2E_DATABASE_URL });
  const db = new PrismaClient({ adapter });

  try {
    const { count } = await db.rateLimitBucket.deleteMany({});
    if (count > 0) {
      console.log(`[e2e] cleared ${count} rate-limit bucket(s).`);
    }
  } finally {
    await db.$disconnect();
  }
}
