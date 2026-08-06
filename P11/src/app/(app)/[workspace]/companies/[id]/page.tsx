import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireWorkspace } from "@/server/tenancy";
import { getCompany } from "@/server/services/company";
import { listContacts } from "@/server/services/contact";
import { listDeals } from "@/server/services/deal";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import { listMembers } from "@/server/services/workspace";
import { serializeCompany, serializeDeal } from "@/lib/serialize";

import { CompanyDetailClient } from "./company-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}): Promise<Metadata> {
  const { workspace: slug, id } = await params;
  const { workspace } = await requireWorkspace(slug);
  const company = await getCompany(workspace.id, id);
  return { title: company?.name ?? "Company" };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const { workspace } = await requireWorkspace(slug);

  const company = await getCompany(workspace.id, id);
  if (!company) notFound();

  const [contactsPage, dealsPage, customFieldDefs, members] = await Promise.all(
    [
      listContacts(workspace.id, { companyId: company.id }),
      listDeals(workspace.id, { companyId: company.id }),
      listCustomFieldDefs(workspace.id, "company"),
      listMembers(workspace.id),
    ],
  );

  const owners = members.map((m) => ({
    id: m.id,
    label: m.user.name ?? m.user.email,
  }));
  const ownerLabel = company.ownerId
    ? (owners.find((o) => o.id === company.ownerId)?.label ?? null)
    : null;

  return (
    <CompanyDetailClient
      workspaceSlug={slug}
      company={serializeCompany(company)}
      ownerLabel={ownerLabel}
      owners={owners}
      customFieldDefs={customFieldDefs}
      contacts={contactsPage.items}
      deals={dealsPage.items.map(serializeDeal)}
    />
  );
}
