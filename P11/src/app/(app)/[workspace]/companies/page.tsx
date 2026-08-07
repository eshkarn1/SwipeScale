import type { Metadata } from "next";

import { requireWorkspace } from "@/server/tenancy";
import {
  COMPANY_DEFAULT_SORT,
  COMPANY_SORT_FIELDS,
  listCompanies,
  listCompanyIndustries,
} from "@/server/services/company";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import { listSavedViews } from "@/server/services/saved-view";
import { listMembers } from "@/server/services/workspace";
import { parseSortParam } from "@/lib/pagination";
import { serializeCompany } from "@/lib/serialize";

import { CompaniesClient } from "./companies-client";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace: slug } = await params;
  const sp = await searchParams;
  const { workspace } = await requireWorkspace(slug);

  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  // `parseSortParam` validates against COMPANY_SORT_FIELDS, so an unknown or
  // hand-edited `?sort=` degrades to the default rather than reaching Prisma.
  const sort = parseSortParam(
    one(sp.sort),
    COMPANY_SORT_FIELDS,
    COMPANY_DEFAULT_SORT,
  );

  const [data, industries, members, customFieldDefs, savedViews] =
    await Promise.all([
      listCompanies(workspace.id, {
        q: one(sp.q),
        industry: one(sp.industry),
        ownerId: one(sp.owner),
        deleted: one(sp.deleted) === "1",
        sort,
        after: one(sp.after),
        before: one(sp.before),
      }),
      listCompanyIndustries(workspace.id),
      listMembers(workspace.id),
      listCustomFieldDefs(workspace.id, "company"),
      listSavedViews(workspace.id, "company"),
    ]);

  const owners = members.map((m) => ({
    id: m.id,
    label: m.user.name ?? m.user.email,
  }));
  // `annualRevenue` is a Prisma `Decimal` — see src/lib/serialize.ts for
  // why it can't cross into `CompaniesClient` (a Client Component) as-is.
  const serializedData = { ...data, items: data.items.map(serializeCompany) };

  return (
    <CompaniesClient
      workspaceSlug={slug}
      data={serializedData}
      industries={industries}
      owners={owners}
      customFieldDefs={customFieldDefs}
      savedViews={savedViews}
    />
  );
}
