/**
 * DB-backed fixed-window rate limiter.
 *
 * BUILD_SPEC §8 requires auth endpoints capped at 5 attempts / 15 min / IP.
 * The stack table rules out Redis/BullMQ for v1 ("Vercel Cron route
 * handlers for v1"), and an in-memory counter does not survive across
 * serverless instances, so the counter lives in `RateLimitBucket`
 * (`prisma/schema.prisma`) instead. A single atomic `upsert` per check keeps
 * it race-safe under concurrent requests.
 */
import { db } from "@/server/db";

const WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 5;

export class RateLimitExceededError extends Error {
  override name = "RateLimitExceededError";
  constructor(public readonly retryAfterMs: number) {
    super("Too many attempts. Try again later.");
  }
}

/**
 * Increments the counter for `key` in the current window and throws
 * {@link RateLimitExceededError} once `limit` is exceeded.
 *
 * @param key A caller-chosen bucket, e.g. `"magic-link:<ip>"` or
 *   `"invite-accept:<ip>"`. Callers are responsible for choosing a key that
 *   actually identifies the thing being limited — this function does not
 *   inspect the request itself.
 */
export async function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = WINDOW_MS,
): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const bucket = await db.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (bucket.count > limit) {
    const retryAfterMs = windowStart.getTime() + windowMs - Date.now();
    throw new RateLimitExceededError(Math.max(retryAfterMs, 0));
  }
}

/**
 * Best-effort client IP extraction from standard proxy headers. Returns
 * `"unknown"` rather than throwing when nothing is present (e.g. local dev
 * without a proxy in front) — better to share one bucket than to crash the
 * request over a missing header.
 */
export function extractClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
