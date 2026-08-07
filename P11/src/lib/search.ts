/**
 * The shape and the tuning constants of a search result, in a module with no
 * server dependencies.
 *
 * These deliberately do NOT live in `src/server/services/search.ts`. The
 * command palette is a Client Component and needs `MIN_QUERY_LENGTH` as a
 * *value* — importing it from the service would pull `@/server/db`, Prisma
 * and the `pg` driver into the browser bundle, which fails the build with
 * `Module not found: Can't resolve 'fs'` from deep inside
 * `pg-connection-string`. A type-only import would have been erased and
 * caused no such problem, which is what makes this trap easy to walk into:
 * adding one shared constant to an existing type import breaks the build,
 * and the error names a transitive dependency nobody wrote an import for.
 *
 * Rule of thumb this file encodes: anything a Client Component imports as a
 * value belongs in `src/lib/`, never in `src/server/`.
 */

export type SearchHitType = "company" | "contact" | "deal";

export interface SearchHit {
  id: string;
  type: SearchHitType;
  label: string;
  /** Secondary line — a domain, an email, the stage name. */
  sublabel: string | null;
}

/** Per entity, not overall — so a workspace with hundreds of matching
 * companies cannot push its contacts and deals off the list. */
export const SEARCH_LIMIT = 5;

/** Below this the palette shows its navigation commands instead: a
 * single-character query matches most of a workspace and reads as noise. */
export const MIN_QUERY_LENGTH = 2;
