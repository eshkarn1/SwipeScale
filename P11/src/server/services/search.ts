/**
 * Cross-record search behind the ⌘K command palette (BUILD_SPEC §7 M2:
 * "Global command palette (⌘K) for search and navigation").
 *
 * Two properties are deliberate:
 *
 * 1. **It returns a projection, never a row.** `SearchHit` is four strings.
 *    A `Deal` row carries `amount`, a Prisma `Decimal`, which cannot cross
 *    into a Client Component and fails silently past every automated gate
 *    (see `src/lib/serialize.ts`). Projecting here means the palette can
 *    never reintroduce that bug, rather than relying on a caller to remember
 *    a `serializeDeal` call.
 * 2. **Each entity is capped independently.** A workspace with 400 matching
 *    companies must not push its contacts and deals off the list — a
 *    palette that only ever shows one kind of record is not a global search.
 *
 * `q` is matched case-insensitively as a substring. It is passed as a Prisma
 * parameter, never interpolated, so it needs no escaping.
 *
 * The result shape and the two constants live in `src/lib/search.ts`, not
 * here — the palette is a Client Component and imports `MIN_QUERY_LENGTH` as
 * a value. See that file for why importing it from this module breaks the
 * build.
 */
import { db } from "@/server/db";
import { MIN_QUERY_LENGTH, SEARCH_LIMIT, type SearchHit } from "@/lib/search";

export type { SearchHit, SearchHitType } from "@/lib/search";

export async function searchWorkspace(
  workspaceId: string,
  q: string,
): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < MIN_QUERY_LENGTH) return [];

  const [companies, contacts, deals] = await Promise.all([
    db.company.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { domain: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, domain: true },
      orderBy: { name: "asc" },
      take: SEARCH_LIMIT,
    }),
    db.contact.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: { select: { name: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: SEARCH_LIMIT,
    }),
    db.deal.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        title: { contains: term, mode: "insensitive" },
      },
      select: {
        id: true,
        title: true,
        stage: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: SEARCH_LIMIT,
    }),
  ]);

  return [
    ...companies.map((c): SearchHit => ({
      id: c.id,
      type: "company",
      label: c.name,
      sublabel: c.domain,
    })),
    ...contacts.map((c): SearchHit => ({
      id: c.id,
      type: "contact",
      label: [c.firstName, c.lastName].filter(Boolean).join(" "),
      sublabel: c.email ?? c.company?.name ?? null,
    })),
    ...deals.map((d): SearchHit => ({
      id: d.id,
      type: "deal",
      label: d.title,
      // The stage name is workspace data (a `Stage` row seeded from the
      // vertical preset), not a literal — DECISIONS §8.6.
      sublabel: d.stage.name,
    })),
  ];
}
