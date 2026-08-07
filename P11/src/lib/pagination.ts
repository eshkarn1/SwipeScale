/**
 * Cursor (keyset) pagination and multi-field sorting for the M2 record lists.
 *
 * BUILD_SPEC §7 M2 asks for "pagination (cursor-based)". DECISIONS §10.1
 * originally scoped that down to offset/page, on the grounds that a keyset
 * cursor against a user-chosen sort column needs a compound cursor
 * `(sortValue, id)` re-derived per column. That reasoning was correct about
 * the cost and wrong about the conclusion — this file is that compound
 * cursor, written once and shared by all three record services, so the cost
 * is paid a single time rather than per list.
 *
 * ── HOW IT WORKS ──────────────────────────────────────────────────────────
 * A sort is an ordered list of `{ field, dir }` (TanStack Table's multi-sort
 * state, serialised into the URL as `sort=name:asc,employees:desc`). `id` is
 * always appended as a final tiebreaker, because a keyset predicate is only
 * correct if the ordering is total — two rows with the same `name` and no
 * further discriminator would page against each other forever.
 *
 * The cursor is the sorted row's values for exactly those fields, base64url
 * JSON, with the sort signature embedded. The signature is what makes a
 * stale cursor safe: change the sort while holding `?after=…` and the cursor
 * decodes to `null` and the list falls back to its first page, rather than
 * silently applying a predicate whose columns no longer match the ordering.
 *
 * ── NULLS ─────────────────────────────────────────────────────────────────
 * Postgres orders NULLS LAST for ASC and NULLS FIRST for DESC by default,
 * which would mean two different keyset predicates per direction. Every
 * nullable sort column here is pinned to `nulls: "last"` in BOTH directions
 * instead, so there is one rule: non-null values in `dir` order, then the
 * nulls, then `id`. `buildKeysetFilter` depends on that pinning — the two
 * must be changed together or paging silently skips or repeats the null
 * block.
 *
 * Nothing in this file is client-safe: `encodeCursor` uses `Buffer`. Client
 * components receive a cursor only as an opaque string and must import from
 * here with `import type`.
 */

/** Rows per page. Services fetch `PAGE_SIZE + 1` to detect "there is more"
 * without a second query. */
export const PAGE_SIZE = 25;

/** A list may sort by at most this many columns at once. TanStack Table
 * allows unbounded multi-sort; the cap keeps the cursor short and the
 * generated `OR` predicate to a sane number of terms (one per sort field). */
export const MAX_SORT_FIELDS = 3;

export type SortDir = "asc" | "desc";

/** How a cursor value round-trips through JSON. `decimal` stays a string —
 * Prisma accepts a decimal string for a `Decimal` comparison, and a float
 * would lose precision (BUILD_SPEC §8: money is never a float). */
export type SortValueType = "string" | "number" | "date" | "decimal";

export interface SortFieldMeta {
  type: SortValueType;
  /** Drives both the `nulls: "last"` pin in `orderBy` and the null branches
   * of the keyset predicate. Must match `schema.prisma` exactly. */
  nullable: boolean;
}

/** The sortable columns of one entity. Doubles as the allow-list: a `sort`
 * param naming anything absent from this map is discarded, so a client can
 * never make the service order by an arbitrary column. */
export type SortFieldMap = Readonly<Record<string, SortFieldMeta>>;

export interface SortSpec {
  field: string;
  dir: SortDir;
}

/** JSON-safe form of a sort column's value. `null` is a real, meaningful
 * value here (the row sorts into the nulls block), not "absent". */
export type CursorValue = string | number | null;

export interface CursorPage<T> {
  items: T[];
  /** Matching rows ignoring the cursor. Kept because "N results" is worth
   * showing and `count` is not the part offset pagination made slow. */
  total: number;
  pageSize: number;
  /** Opaque. Pass back as `?after=`. `null` means this is the last page. */
  nextCursor: string | null;
  /** Opaque. Pass back as `?before=`. `null` means this is the first page. */
  prevCursor: string | null;
}

/** Which end of the current page a cursor addresses. */
export type CursorDirection = "after" | "before";

// ── Sort parsing ──────────────────────────────────────────────────────────

/**
 * Parses `sort=name:asc,employees:desc` into a validated spec list.
 *
 * Unknown fields, duplicates and anything past `MAX_SORT_FIELDS` are dropped
 * silently rather than throwing: a sort param is user-facing URL state, and a
 * saved view written against an older column set should degrade to a usable
 * list, not a 500.
 */
export function parseSortParam(
  raw: string | undefined,
  fields: SortFieldMap,
  fallback: readonly SortSpec[],
): SortSpec[] {
  if (!raw) return [...fallback];

  const seen = new Set<string>();
  const specs: SortSpec[] = [];

  for (const part of raw.split(",")) {
    const [field, dirRaw] = part.split(":");
    // `Object.hasOwn`, never `field in fields` — `"toString" in fields` is
    // true for any object, which would let a client sort by a prototype key.
    if (!field || !Object.hasOwn(fields, field) || seen.has(field)) continue;
    seen.add(field);
    specs.push({ field, dir: dirRaw === "desc" ? "desc" : "asc" });
    if (specs.length === MAX_SORT_FIELDS) break;
  }

  return specs.length > 0 ? specs : [...fallback];
}

export function serializeSortParam(specs: readonly SortSpec[]): string {
  return specs.map((s) => `${s.field}:${s.dir}`).join(",");
}

/** The user's sort plus the mandatory `id` tiebreaker. `id` inherits the
 * last column's direction so a descending list stays descending all the way
 * down rather than flipping within a tie group. */
function withTiebreak(specs: readonly SortSpec[]): SortSpec[] {
  if (specs.some((s) => s.field === "id")) return [...specs];
  const dir = specs.at(-1)?.dir ?? "asc";
  return [...specs, { field: "id", dir }];
}

function flip(dir: SortDir): SortDir {
  return dir === "asc" ? "desc" : "asc";
}

// ── Cursor encoding ───────────────────────────────────────────────────────

interface CursorPayload {
  /** Sort signature this cursor was cut against. */
  s: string;
  v: CursorValue[];
}

function signatureOf(specs: readonly SortSpec[]): string {
  return serializeSortParam(withTiebreak(specs));
}

function toCursorValue(value: unknown): CursorValue {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  // Prisma.Decimal and anything else that knows its own string form. The
  // string is exactly what `fromCursorValue` hands back to Prisma.
  return String(value);
}

/** Cuts a cursor from a row — the values of every sort column plus `id`. */
export function encodeCursor(
  specs: readonly SortSpec[],
  row: Record<string, unknown>,
): string {
  const payload: CursorPayload = {
    s: signatureOf(specs),
    v: withTiebreak(specs).map((spec) => toCursorValue(row[spec.field])),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * Returns the cursor's values, or `null` if it is absent, malformed, or was
 * cut against a different sort. Every one of those cases means "start from
 * the first page" — never an error, because all three are reachable by
 * editing the URL or loading a saved view.
 */
export function decodeCursor(
  raw: string | undefined,
  specs: readonly SortSpec[],
): CursorValue[] | null {
  if (!raw) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) return null;
  const { s, v } = payload as Partial<CursorPayload>;
  if (typeof s !== "string" || s !== signatureOf(specs)) return null;
  if (!Array.isArray(v) || v.length !== withTiebreak(specs).length) return null;

  for (const entry of v) {
    if (
      entry !== null &&
      typeof entry !== "string" &&
      typeof entry !== "number"
    )
      return null;
  }
  return v;
}

/** JSON value -> the type Prisma wants in a `where`. */
function fromCursorValue(
  value: CursorValue,
  meta: SortFieldMeta | undefined,
): unknown {
  if (value === null) return null;
  switch (meta?.type) {
    case "date":
      return new Date(String(value));
    case "number":
      return typeof value === "number" ? value : Number(value);
    // A `Decimal` column compares correctly against a decimal string, and
    // `id` (no meta) is a cuid string.
    default:
      return String(value);
  }
}

// ── Query construction ────────────────────────────────────────────────────

/**
 * `orderBy` for a Prisma `findMany`, with `id` appended and every nullable
 * column pinned to `nulls: "last"` (see the file header).
 *
 * `reverse` is how the "Previous" page is read: run the whole ordering
 * backwards, take a page, then reverse the rows back. The nulls pin flips
 * with it, because reading a NULLS LAST ordering backwards puts the nulls
 * first.
 *
 * The assertion is the one place a dynamically-keyed object meets Prisma's
 * generated `*OrderByWithRelationInput`. The shape produced here is exactly
 * that type; TypeScript simply cannot see it through a computed key.
 */
export function buildOrderBy<TOrderBy>(
  specs: readonly SortSpec[],
  fields: SortFieldMap,
  reverse = false,
): TOrderBy[] {
  return withTiebreak(specs).map((spec) => {
    const dir = reverse ? flip(spec.dir) : spec.dir;
    const meta = fields[spec.field];
    const clause = meta?.nullable
      ? { [spec.field]: { sort: dir, nulls: reverse ? "first" : "last" } }
      : { [spec.field]: dir };
    return clause as unknown as TOrderBy;
  });
}

/**
 * The "strictly past the cursor on this column" predicate, given that nulls
 * always sort last in the forward direction.
 *
 * Returns `null` when the term is impossible — asking what sorts *after* a
 * null, when nulls are last, has no answer. That term must be omitted from
 * the `OR` entirely rather than written as an equality, which would wrongly
 * admit rows that tie here and sort *before* the cursor further down.
 */
function stepPredicate(
  field: string,
  dir: SortDir,
  value: unknown,
  direction: CursorDirection,
  nullable: boolean,
): Record<string, unknown> | null {
  if (direction === "after") {
    if (value === null) return null;
    const op = dir === "asc" ? "gt" : "lt";
    const strictly = { [field]: { [op]: value } };
    // Past a real value, in the forward direction, also lies the null block.
    return nullable ? { OR: [strictly, { [field]: null }] } : strictly;
  }

  // Backwards: everything non-null precedes the null block.
  if (value === null) {
    return nullable ? { [field]: { not: null } } : null;
  }
  const op = dir === "asc" ? "lt" : "gt";
  return { [field]: { [op]: value } };
}

/**
 * The compound keyset predicate for a cursor: an `OR` of one term per sort
 * column, where term *i* is "equal on columns 0..i-1, strictly past on i".
 *
 * Returns `null` when there is nothing to filter (no cursor, or every term
 * turned out impossible), in which case the caller queries unfiltered.
 */
export function buildKeysetFilter<TWhere>(
  specs: readonly SortSpec[],
  fields: SortFieldMap,
  values: CursorValue[],
  direction: CursorDirection,
): TWhere | null {
  const full = withTiebreak(specs);
  if (values.length !== full.length) return null;

  const decoded = full.map((spec, i) =>
    fromCursorValue(values[i] ?? null, fields[spec.field]),
  );

  const terms: Record<string, unknown>[] = [];

  for (let i = 0; i < full.length; i++) {
    const spec = full[i];
    if (!spec) continue;
    const step = stepPredicate(
      spec.field,
      spec.dir,
      decoded[i],
      direction,
      fields[spec.field]?.nullable ?? false,
    );
    if (!step) continue;

    const conditions: Record<string, unknown>[] = [];
    for (let j = 0; j < i; j++) {
      const prior = full[j];
      if (prior) conditions.push({ [prior.field]: decoded[j] });
    }
    conditions.push(step);

    terms.push(
      conditions.length === 1
        ? (conditions[0] as Record<string, unknown>)
        : { AND: conditions },
    );
  }

  if (terms.length === 0) return null;
  // Same assertion as `buildOrderBy`, same reason: this is a `*WhereInput`
  // built through computed keys.
  return { OR: terms } as unknown as TWhere;
}

// ── Plan / finish ─────────────────────────────────────────────────────────

export interface CursorPlan<TWhere, TOrderBy> {
  /** `AND` this with the list's own filters. `null` = first page. */
  keysetFilter: TWhere | null;
  orderBy: TOrderBy[];
  /** Always `PAGE_SIZE + 1` — the extra row is the "is there more" probe. */
  take: number;
  direction: CursorDirection;
  specs: SortSpec[];
  hadCursor: boolean;
}

export interface CursorParams {
  after?: string;
  before?: string;
}

/**
 * Turns `{ sort, after?, before? }` into everything a `findMany` needs.
 * `before` wins if both are somehow present — a URL carrying both is
 * malformed, and picking one deterministically beats erroring.
 */
export function planCursorPage<TWhere, TOrderBy>(
  specs: readonly SortSpec[],
  fields: SortFieldMap,
  params: CursorParams,
): CursorPlan<TWhere, TOrderBy> {
  const direction: CursorDirection = params.before ? "before" : "after";
  const raw = params.before ?? params.after;
  const values = decodeCursor(raw, specs);

  return {
    keysetFilter: values
      ? buildKeysetFilter<TWhere>(specs, fields, values, direction)
      : null,
    orderBy: buildOrderBy<TOrderBy>(specs, fields, direction === "before"),
    take: PAGE_SIZE + 1,
    direction,
    specs: [...specs],
    hadCursor: values !== null,
  };
}

/**
 * Trims the probe row, restores reading order for a backwards page, and cuts
 * the two cursors.
 *
 * The asymmetry is deliberate and is what makes Previous/Next both correct:
 * paging forward, a previous page exists exactly when we arrived by cursor;
 * paging backward, a next page exists unconditionally, because we just came
 * from it.
 */
export function buildCursorPage<T extends Record<string, unknown>>(
  rows: T[],
  total: number,
  plan: CursorPlan<unknown, unknown>,
): CursorPage<T> {
  const hasExtra = rows.length > PAGE_SIZE;
  const page = hasExtra ? rows.slice(0, PAGE_SIZE) : rows;
  const items = plan.direction === "before" ? [...page].reverse() : page;

  const first = items[0];
  const last = items.at(-1);

  if (!first || !last) {
    return {
      items,
      total,
      pageSize: PAGE_SIZE,
      nextCursor: null,
      prevCursor: null,
    };
  }

  const nextCursor =
    plan.direction === "after"
      ? hasExtra
        ? encodeCursor(plan.specs, last)
        : null
      : encodeCursor(plan.specs, last);

  const prevCursor =
    plan.direction === "after"
      ? plan.hadCursor
        ? encodeCursor(plan.specs, first)
        : null
      : hasExtra
        ? encodeCursor(plan.specs, first)
        : null;

  return { items, total, pageSize: PAGE_SIZE, nextCursor, prevCursor };
}
