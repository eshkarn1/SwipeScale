/**
 * Unit tests for the keyset cursor. These are the parts that are pure
 * functions of their inputs — parsing, encoding, and the shape of the
 * generated Prisma predicate. The parts that need a real Postgres (does
 * paging actually visit every row exactly once, including across the null
 * block) live in `src/server/tenancy.test.ts` against the seeded fixture,
 * because ordering semantics are the database's, not this file's.
 */
import { describe, expect, it } from "vitest";

import {
  buildKeysetFilter,
  buildOrderBy,
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  MAX_SORT_FIELDS,
  PAGE_SIZE,
  parseSortParam,
  planCursorPage,
  serializeSortParam,
  type CursorPlan,
  type SortFieldMap,
  type SortSpec,
} from "./pagination";

const FIELDS: SortFieldMap = {
  name: { type: "string", nullable: false },
  employees: { type: "number", nullable: true },
  annualRevenue: { type: "decimal", nullable: true },
  createdAt: { type: "date", nullable: false },
};

const FALLBACK: SortSpec[] = [{ field: "name", dir: "asc" }];

describe("parseSortParam", () => {
  it("falls back when the param is absent", () => {
    expect(parseSortParam(undefined, FIELDS, FALLBACK)).toEqual(FALLBACK);
  });

  it("parses a multi-field sort in order", () => {
    expect(parseSortParam("employees:desc,name:asc", FIELDS, FALLBACK)).toEqual(
      [
        { field: "employees", dir: "desc" },
        { field: "name", dir: "asc" },
      ],
    );
  });

  it("defaults an unrecognised direction to asc", () => {
    expect(parseSortParam("name:sideways", FIELDS, FALLBACK)).toEqual([
      { field: "name", dir: "asc" },
    ]);
  });

  it("drops fields that are not in the allow-list", () => {
    // The whole point of the map doubling as an allow-list: a client cannot
    // make the service order by an arbitrary column.
    expect(parseSortParam("password:asc,name:desc", FIELDS, FALLBACK)).toEqual([
      { field: "name", dir: "desc" },
    ]);
  });

  it("rejects prototype keys rather than treating them as columns", () => {
    // `"toString" in fields` is true for every object — this is why the
    // implementation uses Object.hasOwn.
    expect(parseSortParam("toString:asc", FIELDS, FALLBACK)).toEqual(FALLBACK);
  });

  it("drops duplicates, keeping the first occurrence", () => {
    expect(parseSortParam("name:asc,name:desc", FIELDS, FALLBACK)).toEqual([
      { field: "name", dir: "asc" },
    ]);
  });

  it("caps the number of sort fields", () => {
    const parsed = parseSortParam(
      "name:asc,employees:asc,annualRevenue:asc,createdAt:asc",
      FIELDS,
      FALLBACK,
    );
    expect(parsed).toHaveLength(MAX_SORT_FIELDS);
  });

  it("round-trips through serializeSortParam", () => {
    const raw = "employees:desc,name:asc";
    expect(serializeSortParam(parseSortParam(raw, FIELDS, FALLBACK))).toBe(raw);
  });
});

describe("encodeCursor / decodeCursor", () => {
  const specs: SortSpec[] = [{ field: "name", dir: "asc" }];
  const row = { id: "c1", name: "Acme", employees: 12 };

  it("round-trips the sort values plus the id tiebreaker", () => {
    expect(decodeCursor(encodeCursor(specs, row), specs)).toEqual([
      "Acme",
      "c1",
    ]);
  });

  it("encodes a null sort value as null rather than dropping it", () => {
    const cursor = encodeCursor([{ field: "employees", dir: "asc" }], {
      id: "c1",
      employees: null,
    });
    expect(decodeCursor(cursor, [{ field: "employees", dir: "asc" }])).toEqual([
      null,
      "c1",
    ]);
  });

  it("encodes a Date as an ISO string", () => {
    const cursor = encodeCursor([{ field: "createdAt", dir: "desc" }], {
      id: "c1",
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
    });
    expect(decodeCursor(cursor, [{ field: "createdAt", dir: "desc" }])).toEqual(
      ["2026-01-02T03:04:05.000Z", "c1"],
    );
  });

  it("returns null for a cursor cut against a different sort", () => {
    // The stale-cursor case: hold ?after= and change the sort. Must reset to
    // the first page, never apply a predicate whose columns no longer match
    // the ordering.
    const cursor = encodeCursor(specs, row);
    expect(
      decodeCursor(cursor, [{ field: "employees", dir: "asc" }]),
    ).toBeNull();
  });

  it("returns null for a cursor cut against a different direction", () => {
    const cursor = encodeCursor(specs, row);
    expect(decodeCursor(cursor, [{ field: "name", dir: "desc" }])).toBeNull();
  });

  it("returns null for malformed input rather than throwing", () => {
    expect(decodeCursor("not-base64-json", specs)).toBeNull();
    expect(decodeCursor("", specs)).toBeNull();
    expect(decodeCursor(undefined, specs)).toBeNull();
  });
});

describe("buildOrderBy", () => {
  it("appends the id tiebreaker, inheriting the last direction", () => {
    expect(buildOrderBy([{ field: "name", dir: "desc" }], FIELDS)).toEqual([
      { name: "desc" },
      { id: "desc" },
    ]);
  });

  it("pins nullable columns to nulls last in both directions", () => {
    expect(buildOrderBy([{ field: "employees", dir: "asc" }], FIELDS)).toEqual([
      { employees: { sort: "asc", nulls: "last" } },
      { id: "asc" },
    ]);
    expect(buildOrderBy([{ field: "employees", dir: "desc" }], FIELDS)).toEqual(
      [{ employees: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    );
  });

  it("reverses direction and nulls placement for a backwards page", () => {
    expect(
      buildOrderBy([{ field: "employees", dir: "asc" }], FIELDS, true),
    ).toEqual([
      { employees: { sort: "desc", nulls: "first" } },
      { id: "desc" },
    ]);
  });

  it("does not append a second id clause when the caller already sorts by id", () => {
    expect(buildOrderBy([{ field: "id", dir: "asc" }], FIELDS)).toEqual([
      { id: "asc" },
    ]);
  });
});

describe("buildKeysetFilter", () => {
  it("builds one OR term per sort column, prefixed by equality", () => {
    const specs: SortSpec[] = [{ field: "name", dir: "asc" }];
    expect(buildKeysetFilter(specs, FIELDS, ["Acme", "c1"], "after")).toEqual({
      OR: [
        { name: { gt: "Acme" } },
        { AND: [{ name: "Acme" }, { id: { gt: "c1" } }] },
      ],
    });
  });

  it("treats the null block as sorting after every real value", () => {
    const specs: SortSpec[] = [{ field: "employees", dir: "asc" }];
    expect(buildKeysetFilter(specs, FIELDS, [10, "c1"], "after")).toEqual({
      OR: [
        { OR: [{ employees: { gt: 10 } }, { employees: null }] },
        { AND: [{ employees: 10 }, { id: { gt: "c1" } }] },
      ],
    });
  });

  it("omits the impossible term when the cursor sits in the null block", () => {
    // Nothing sorts strictly after a null when nulls are last, so the
    // employees term must be dropped entirely — writing it as an equality
    // would admit rows that tie here and sort BEFORE the cursor on id.
    const specs: SortSpec[] = [{ field: "employees", dir: "asc" }];
    expect(buildKeysetFilter(specs, FIELDS, [null, "c1"], "after")).toEqual({
      OR: [{ AND: [{ employees: null }, { id: { gt: "c1" } }] }],
    });
  });

  it("inverts every comparison for a backwards page", () => {
    const specs: SortSpec[] = [{ field: "name", dir: "asc" }];
    expect(buildKeysetFilter(specs, FIELDS, ["Acme", "c1"], "before")).toEqual({
      OR: [
        { name: { lt: "Acme" } },
        { AND: [{ name: "Acme" }, { id: { lt: "c1" } }] },
      ],
    });
  });

  it("reaches the whole non-null block when paging back out of the nulls", () => {
    const specs: SortSpec[] = [{ field: "employees", dir: "asc" }];
    expect(buildKeysetFilter(specs, FIELDS, [null, "c1"], "before")).toEqual({
      OR: [
        { employees: { not: null } },
        { AND: [{ employees: null }, { id: { lt: "c1" } }] },
      ],
    });
  });

  it("keeps a decimal cursor as a string", () => {
    // BUILD_SPEC §8: money never becomes a float, not even in a predicate.
    const specs: SortSpec[] = [{ field: "annualRevenue", dir: "desc" }];
    expect(
      buildKeysetFilter(specs, FIELDS, ["1234567.89", "c1"], "after"),
    ).toEqual({
      OR: [
        {
          OR: [
            { annualRevenue: { lt: "1234567.89" } },
            { annualRevenue: null },
          ],
        },
        { AND: [{ annualRevenue: "1234567.89" }, { id: { lt: "c1" } }] },
      ],
    });
  });

  it("rehydrates a date cursor into a Date", () => {
    const specs: SortSpec[] = [{ field: "createdAt", dir: "desc" }];
    const filter = buildKeysetFilter<{
      OR: { createdAt?: { lt: Date } }[];
    }>(specs, FIELDS, ["2026-01-02T03:04:05.000Z", "c1"], "after");
    expect(filter?.OR[0]?.createdAt?.lt).toBeInstanceOf(Date);
  });

  it("returns null when the cursor length does not match the sort", () => {
    expect(
      buildKeysetFilter(
        [{ field: "name", dir: "asc" }],
        FIELDS,
        ["x"],
        "after",
      ),
    ).toBeNull();
  });

  it("chains equality across every prior column in a multi-sort", () => {
    const specs: SortSpec[] = [
      { field: "name", dir: "asc" },
      { field: "employees", dir: "desc" },
    ];
    expect(
      buildKeysetFilter(specs, FIELDS, ["Acme", 10, "c1"], "after"),
    ).toEqual({
      OR: [
        { name: { gt: "Acme" } },
        {
          AND: [
            { name: "Acme" },
            { OR: [{ employees: { lt: 10 } }, { employees: null }] },
          ],
        },
        {
          AND: [{ name: "Acme" }, { employees: 10 }, { id: { lt: "c1" } }],
        },
      ],
    });
  });
});

describe("planCursorPage", () => {
  const specs: SortSpec[] = [{ field: "name", dir: "asc" }];

  it("plans a first page with no keyset filter", () => {
    const plan = planCursorPage(specs, FIELDS, {});
    expect(plan.keysetFilter).toBeNull();
    expect(plan.hadCursor).toBe(false);
    expect(plan.direction).toBe("after");
    expect(plan.take).toBe(PAGE_SIZE + 1);
  });

  it("reads `before` as a backwards page", () => {
    const cursor = encodeCursor(specs, { id: "c1", name: "Acme" });
    const plan = planCursorPage(specs, FIELDS, { before: cursor });
    expect(plan.direction).toBe("before");
    expect(plan.hadCursor).toBe(true);
  });

  it("ignores a stale cursor instead of applying it", () => {
    const cursor = encodeCursor([{ field: "createdAt", dir: "asc" }], {
      id: "c1",
      createdAt: new Date(),
    });
    const plan = planCursorPage(specs, FIELDS, { after: cursor });
    expect(plan.keysetFilter).toBeNull();
    expect(plan.hadCursor).toBe(false);
  });
});

describe("buildCursorPage", () => {
  const specs: SortSpec[] = [{ field: "name", dir: "asc" }];
  const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ({
    id: `c${i}`,
    name: `Row ${i}`,
  }));

  function plan(
    direction: "after" | "before",
    hadCursor: boolean,
  ): CursorPlan<unknown, unknown> {
    return {
      keysetFilter: null,
      orderBy: [],
      take: PAGE_SIZE + 1,
      direction,
      specs,
      hadCursor,
    };
  }

  it("trims the probe row and offers a next cursor", () => {
    const page = buildCursorPage(rows, 100, plan("after", false));
    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.nextCursor).not.toBeNull();
    // First page — nothing before it.
    expect(page.prevCursor).toBeNull();
  });

  it("offers no next cursor when the probe row did not come back", () => {
    const page = buildCursorPage(rows.slice(0, 3), 3, plan("after", false));
    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBeNull();
  });

  it("offers a prev cursor once we arrived by cursor", () => {
    const page = buildCursorPage(rows.slice(0, 3), 100, plan("after", true));
    expect(page.prevCursor).not.toBeNull();
  });

  it("restores reading order for a backwards page", () => {
    // The query ran the ordering in reverse, so the rows arrive reversed:
    // c25 … c0. The probe row is therefore the one FURTHEST back (c0), and
    // dropping it trims the far end, not the near one. After reversing back,
    // the page reads c1 … c25 and c0 is what proves a further-previous page
    // exists.
    const reversed = [...rows].reverse();
    const page = buildCursorPage(reversed, 100, plan("before", true));
    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.items[0]?.id).toBe(rows[1]?.id);
    expect(page.items.at(-1)?.id).toBe(rows[PAGE_SIZE]?.id);
    expect(page.prevCursor).not.toBeNull();
  });

  it("always offers a next cursor on a backwards page", () => {
    // We arrived here from the page after it, so it demonstrably exists.
    const page = buildCursorPage(rows.slice(0, 3), 100, plan("before", true));
    expect(page.nextCursor).not.toBeNull();
  });

  it("returns both cursors null for an empty result", () => {
    const page = buildCursorPage([], 0, plan("after", false));
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
    expect(page.prevCursor).toBeNull();
  });
});
