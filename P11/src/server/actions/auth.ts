"use server";

/**
 * Auth entry-point actions. BUILD_SPEC §8: `requireWorkspace()` (or, before
 * a workspace exists, nothing but Zod) → Zod parse → service/library call →
 * discriminated result. Rate limiting stands in for "the tenant guard" here
 * because there is no tenant yet.
 */
import { headers } from "next/headers";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { signIn } from "@/server/auth";
import {
  checkRateLimit,
  extractClientIp,
  RateLimitExceededError,
} from "@/server/rate-limit";

/**
 * `callbackUrl`/`redirectTo` values come from a query string a client
 * controls (e.g. `/login?callbackUrl=...`), so they are never passed to
 * `signIn` unvalidated — that's an open-redirect. Only a same-origin
 * relative path (`/join/abc`, `/go`) is accepted; anything else (an
 * absolute URL, `//evil.example`, a `javascript:` scheme) falls back to the
 * default post-login resolver.
 */
function safeRedirectPath(candidate: string | undefined | null): string {
  const fallback = "/go";
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  return candidate;
}

const requestMagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  redirectTo: z.string().optional(),
});

/**
 * BUILD_SPEC §8: auth endpoints rate-limited at 5 attempts / 15 min / IP.
 * Checked before Auth.js creates a verification token, so a flooded IP
 * never gets a single token written on its behalf.
 */
export async function requestMagicLink(
  input: unknown,
): Promise<ActionResult<{ email: string }>> {
  const parsed = requestMagicLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const ip = extractClientIp(await headers());
  try {
    await checkRateLimit(`magic-link:${ip}`);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  try {
    await signIn("resend", {
      email: parsed.data.email,
      redirect: false,
      redirectTo: safeRedirectPath(parsed.data.redirectTo),
    });
  } catch (error) {
    console.error("[auth] magic link request failed:", error);
    return {
      ok: false,
      error: "Couldn't send the sign-in email. Try again in a moment.",
    };
  }

  return { ok: true, data: { email: parsed.data.email } };
}

/**
 * Google OAuth entry point. `signIn` itself redirects (to Google, then back
 * through `/api/auth/callback/google`) — there is no result to return.
 */
export async function signInWithGoogleAction(
  redirectTo?: string,
): Promise<void> {
  await signIn("google", { redirectTo: safeRedirectPath(redirectTo) });
}
