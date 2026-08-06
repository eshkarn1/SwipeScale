import { z } from "zod";

/**
 * A string field that is optional (the key can be absent entirely — matters
 * for a `.partial()` update schema, where "absent" must stay `undefined` so
 * the service leaves that column untouched) and nullable (an explicitly
 * empty string clears it to `null` rather than writing `""` to the DB).
 *
 * Shared by every M2 record action (`company.ts`, `contact.ts`, `deal.ts`)
 * rather than redefined per file, because the distinction it encodes is
 * easy to get wrong: a single `.transform(v => v || null)` collapses "key
 * not sent" and "key sent empty" to the same `null`, which makes a partial
 * update accidentally null out every field the client didn't touch.
 */
export function optionalTrimmedString(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));
}
