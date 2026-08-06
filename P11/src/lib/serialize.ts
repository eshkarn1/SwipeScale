/**
 * Converts a Prisma `Decimal` field to a plain string before it crosses a
 * Server Component -> Client Component boundary (or a Server Action's
 * return value back to the client) — React's Flight protocol has built-in
 * support for a handful of non-JSON types (`Date`, `Map`, `Set`, …) but
 * `Prisma.Decimal` is not one of them, and passing one raises "Only plain
 * objects can be passed to Client Components from Server Components.
 * Decimal objects are not supported."
 *
 * `Company.annualRevenue` and `Deal.amount` are the two `Decimal` columns
 * BUILD_SPEC §4 defines. `src/lib/money.ts`'s `decimalToMinorUnits` already
 * accepts a plain string (it takes `{ toString(): string } | string |
 * number`), so nothing downstream needs to change beyond the type — the
 * client never needs the `Decimal` instance itself, only its string form.
 */
import type { Company, Deal, Prisma } from "@/generated/prisma/client";
import type { DealWithRelations } from "@/server/services/deal";

export function serializeDecimal(value: Prisma.Decimal | null): string | null {
  return value === null ? null : value.toString();
}

/** Any record with a nullable `annualRevenue: Decimal` — `Company` and
 * nothing else, but written generically so a list item (which may carry
 * extra joined fields, e.g. `ContactWithCompany`'s `company`) still works
 * without a second overload. */
export function serializeCompany<
  T extends { annualRevenue: Prisma.Decimal | null },
>(company: T): Omit<T, "annualRevenue"> & { annualRevenue: string | null } {
  return { ...company, annualRevenue: serializeDecimal(company.annualRevenue) };
}

/** Any record with a non-nullable `amount: Decimal` — `Deal`, including the
 * `DealWithRelations` shape returned by `getDeal`/`listDeals`. */
export function serializeDeal<T extends { amount: Prisma.Decimal }>(
  deal: T,
): Omit<T, "amount"> & { amount: string } {
  return { ...deal, amount: deal.amount.toString() };
}

/** Named aliases for the two shapes above, so a client component's props
 * can name "the server-safe version of X" instead of re-deriving the
 * `Omit<..., "amount"> & { amount: string }` shape at every call site. */
export type SerializedCompany = Omit<Company, "annualRevenue"> & {
  annualRevenue: string | null;
};
export type SerializedDeal = Omit<Deal, "amount"> & { amount: string };
export type SerializedDealWithRelations = Omit<DealWithRelations, "amount"> & {
  amount: string;
};
