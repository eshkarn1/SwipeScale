/**
 * Company lifecycle — list/search/filter, get, create, update, soft
 * delete, restore. BUILD_SPEC §7 M2. Every query is scoped by
 * `workspaceId`, and every id-bearing query is `where: { id, workspaceId }`
 * (§5) — a foreign id returns `null`/no-op, never an error that would leak
 * whether the row exists in someone else's workspace.
 */
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { parseCustomFieldValues } from "@/lib/custom-fields";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import {
  buildCursorPage,
  planCursorPage,
  type CursorPage,
  type CursorParams,
  type SortFieldMap,
  type SortSpec,
} from "@/lib/pagination";

import type { Company, Prisma as PrismaNS } from "@/generated/prisma/client";

export class CompanyError extends Error {
  override name = "CompanyError";
}

/** Sortable columns, and the allow-list a `?sort=` param is validated
 * against. `nullable` must match `schema.prisma` — it drives both the
 * `nulls: "last"` pin and the null branches of the keyset predicate, and a
 * wrong flag silently skips or repeats rows at the null boundary. */
export const COMPANY_SORT_FIELDS: SortFieldMap = {
  name: { type: "string", nullable: false },
  domain: { type: "string", nullable: true },
  industry: { type: "string", nullable: true },
  employees: { type: "number", nullable: true },
  annualRevenue: { type: "decimal", nullable: true },
  createdAt: { type: "date", nullable: false },
  updatedAt: { type: "date", nullable: false },
};

export const COMPANY_DEFAULT_SORT: readonly SortSpec[] = [
  { field: "name", dir: "asc" },
];

export interface ListCompaniesParams extends CursorParams {
  q?: string;
  industry?: string;
  ownerId?: string;
  deleted?: boolean;
  /** Already parsed and validated by `parseSortParam`. */
  sort?: readonly SortSpec[];
}

export async function listCompanies(
  workspaceId: string,
  params: ListCompaniesParams = {},
): Promise<CursorPage<Company>> {
  const filters: PrismaNS.CompanyWhereInput = {
    workspaceId,
    deletedAt: params.deleted ? { not: null } : null,
    ...(params.industry ? { industry: params.industry } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { domain: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const plan = planCursorPage<
    PrismaNS.CompanyWhereInput,
    PrismaNS.CompanyOrderByWithRelationInput
  >(params.sort ?? COMPANY_DEFAULT_SORT, COMPANY_SORT_FIELDS, params);

  // The keyset predicate is ANDed with the filters rather than merged into
  // them: both sides can carry an `OR` (search terms on one, the cursor's
  // per-column terms on the other) and a merge would silently drop one.
  const where: PrismaNS.CompanyWhereInput = plan.keysetFilter
    ? { AND: [filters, plan.keysetFilter] }
    : filters;

  const [rows, total] = await Promise.all([
    db.company.findMany({
      where,
      orderBy: plan.orderBy,
      take: plan.take,
    }),
    db.company.count({ where: filters }),
  ]);

  return buildCursorPage(rows, total, plan);
}

export async function getCompany(
  workspaceId: string,
  id: string,
): Promise<Company | null> {
  return db.company.findFirst({ where: { id, workspaceId } });
}

export interface CompanyInput {
  name: string;
  domain?: string | null;
  industry?: string | null;
  employees?: number | null;
  annualRevenue?: string | null; // decimal string, major units — see src/lib/money.ts
  addressCity?: string | null;
  addressCountry?: string | null;
  linkedinUrl?: string | null;
  ownerId?: string | null;
  customFields?: Record<string, unknown>;
}

async function resolveCustomFields(
  workspaceId: string,
  raw: Record<string, unknown> | undefined,
) {
  if (raw === undefined) return undefined;
  const defs = await listCustomFieldDefs(workspaceId, "company");
  return parseCustomFieldValues(defs, raw);
}

async function assertOwnerBelongsToWorkspace(
  workspaceId: string,
  ownerId: string | null | undefined,
) {
  if (!ownerId) return;
  const membership = await db.membership.findFirst({
    where: { id: ownerId, workspaceId },
  });
  if (!membership) {
    throw new CompanyError("That owner is not a member of this workspace.");
  }
}

export async function createCompany(
  workspaceId: string,
  input: CompanyInput,
): Promise<Company> {
  await assertOwnerBelongsToWorkspace(workspaceId, input.ownerId);
  const customFields = await resolveCustomFields(
    workspaceId,
    input.customFields,
  );

  return db.company.create({
    data: {
      workspaceId,
      name: input.name,
      domain: input.domain ?? null,
      industry: input.industry ?? null,
      employees: input.employees ?? null,
      annualRevenue: input.annualRevenue ?? null,
      addressCity: input.addressCity ?? null,
      addressCountry: input.addressCountry ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      ownerId: input.ownerId ?? null,
      customFields: customFields ?? Prisma.JsonNull,
    },
  });
}

export async function updateCompany(
  workspaceId: string,
  id: string,
  input: Partial<CompanyInput>,
): Promise<Company> {
  const existing = await getCompany(workspaceId, id);
  if (!existing) {
    throw new CompanyError("Company not found.");
  }
  if (input.ownerId !== undefined) {
    await assertOwnerBelongsToWorkspace(workspaceId, input.ownerId);
  }

  const customFields: Prisma.InputJsonValue | undefined =
    input.customFields !== undefined
      ? ({
          ...(typeof existing.customFields === "object" &&
          existing.customFields !== null
            ? (existing.customFields as Record<string, unknown>)
            : {}),
          ...(await resolveCustomFields(workspaceId, input.customFields)),
        } as Prisma.InputJsonValue)
      : undefined;

  // Built imperatively (rather than a conditional-spread literal) and typed
  // against Prisma's own update-input type: a spread-conditional object's
  // inferred shape does not cleanly match either the "checked" or
  // "unchecked" variant of a Prisma update input once enough fields are
  // optional, and TS reports that mismatch on an unrelated field.
  const data: PrismaNS.CompanyUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.domain !== undefined) data.domain = input.domain;
  if (input.industry !== undefined) data.industry = input.industry;
  if (input.employees !== undefined) data.employees = input.employees;
  if (input.annualRevenue !== undefined)
    data.annualRevenue = input.annualRevenue;
  if (input.addressCity !== undefined) data.addressCity = input.addressCity;
  if (input.addressCountry !== undefined)
    data.addressCountry = input.addressCountry;
  if (input.linkedinUrl !== undefined) data.linkedinUrl = input.linkedinUrl;
  if (input.ownerId !== undefined) data.ownerId = input.ownerId;
  if (customFields !== undefined) data.customFields = customFields;

  return db.company.update({ where: { id: existing.id }, data });
}

export async function softDeleteCompany(
  workspaceId: string,
  id: string,
): Promise<void> {
  await db.company.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

export async function restoreCompany(
  workspaceId: string,
  id: string,
): Promise<void> {
  await db.company.updateMany({
    where: { id, workspaceId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
}

/** Distinct, non-null `industry` values currently in use — backs the filter
 * chip so it only ever offers choices that exist, rather than a static
 * hardcoded list (this field has no `WorkspaceOption` vocabulary; it is
 * free text, per BUILD_SPEC §4). */
export async function listCompanyIndustries(
  workspaceId: string,
): Promise<string[]> {
  const rows = await db.company.findMany({
    where: { workspaceId, deletedAt: null, industry: { not: null } },
    select: { industry: true },
    distinct: ["industry"],
    orderBy: { industry: "asc" },
  });
  return rows.map((r) => r.industry).filter((v): v is string => v !== null);
}

/** Every active company as a `{ id, name }` pair, unpaginated — feeds the
 * company picker on the Contact and Deal forms/filters, which need the
 * whole list to search client-side rather than the 25-per-page slice
 * `listCompanies` returns for the table itself. */
export async function listCompanyOptions(
  workspaceId: string,
): Promise<{ id: string; name: string }[]> {
  return db.company.findMany({
    where: { workspaceId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 1000,
  });
}
