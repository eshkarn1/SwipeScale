/**
 * Top-level path segments that are not workspace slugs — the marketing
 * site, the auth flow, the admin area, and anything under `/api`. A
 * workspace named "Admin" or "Login" would otherwise be permanently
 * unreachable, shadowed by the static route of the same name (Next.js
 * resolves an exact literal segment before a dynamic `[workspace]` one).
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "go",
  "join",
  "kitchen-sink",
  "legal",
  "login",
  "onboarding",
  "pricing",
  "verify",
  "www",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
