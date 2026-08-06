import type { Metadata } from "next";

import { requireWorkspace } from "@/server/tenancy";
import {
  isCompanySortField,
  listCompanies,
  listCompanyIndustries,
} from "@/server/services/company";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import { listSavedViews } from "@/server/services/saved-view";
import { listMembers } from "@/server/services/workspace";
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
  const sortParam = one(sp.sort);
  const dirParam = one(sp.dir);

  const [data, industries, members, customFieldDefs, savedViews] =
    await Promise.all([
      listCompanies(workspace.id, {
        q: one(sp.q),
        industry: one(sp.industry),
        deleted: one(sp.deleted) === "1",
        sort:
          sortParam && isCompanySortField(sortParam) ? sortParam : undefined,
        dir: dirParam === "desc" ? "desc" : "asc",
        page: one(sp.page) ? Number(one(sp.page)) : undefined,
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
