/**
 * Module augmentation: every server-side call to `auth()` returns a
 * `Session` shaped by this file. `id` and `isPlatformAdmin` are populated in
 * the `session` callback in `src/server/auth.ts` — this only declares the
 * type so callers don't have to cast.
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isPlatformAdmin: boolean;
    } & DefaultSession["user"];
  }
}
