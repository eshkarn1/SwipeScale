/**
 * BUILD_SPEC §8: every server action returns this discriminated shape and
 * never throws to the client. Components branch on `ok` instead of
 * try/catching a server action call.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
