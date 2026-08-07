import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireWorkspace } from "@/server/tenancy";
import {
  getDeal,
  listDeals,
  listDefaultPipelineStages,
} from "@/server/services/deal";
import { listCompanyOptions } from "@/server/services/company";
import { listContactOptions } from "@/server/services/contact";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import { listMembers } from "@/server/services/workspace";
import { listWorkspaceOptions } from "@/server/queries/workspace-options";
import { serializeDeal } from "@/lib/serialize";

import { DealDetailClient } from "./deal-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}): Promise<Metadata> {
  const { workspace: slug, id } = await params;
  const { workspace } = await requireWorkspace(slug);
  const deal = await getDeal(workspace.id, id);
  return { title: deal?.title ?? "Deal" };
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const { workspace } = await requireWorkspace(slug);

  const deal = await getDeal(workspace.id, id);
  if (!deal) notFound();

  const [
    stages,
    companies,
    contacts,
    members,
    customFieldDefs,
    sides,
    contactRoles,
  ] = await Promise.all([
    listDefaultPipelineStages(workspace.id),
    listCompanyOptions(workspace.id),
    listContactOptions(workspace.id),
    listMembers(workspace.id),
    listCustomFieldDefs(workspace.id, "deal"),
    listWorkspaceOptions(workspace.id, "deal_side"),
    listWorkspaceOptions(workspace.id, "deal_contact_role"),
  ]);

  const owners = members.map((m) => ({
    id: m.id,
    label: m.user.name ?? m.user.email,
  }));
  const ownerLabel = deal.ownerId
    ? (owners.find((o) => o.id === deal.ownerId)?.label ?? null)
    : null;
  const contactOptions = contacts.map((c) => ({
    id: c.id,
    label: `${c.firstName} ${c.lastName ?? ""}`.trim(),
  }));

  // The "Deals" tab on a deal shows the rest of that company's book. Only
  // meaningful when the deal has a company at all — otherwise there is no
  // relationship to list, and the tab shows an empty state rather than
  // every deal in the workspace.
  const relatedDeals = deal.companyId
    ? (await listDeals(workspace.id, { companyId: deal.companyId })).items
        .filter((d) => d.id !== deal.id)
        .map(serializeDeal)
    : [];

  return (
    <DealDetailClient
      workspaceSlug={slug}
      deal={serializeDeal(deal)}
      relatedDeals={relatedDeals}
      ownerLabel={ownerLabel}
      owners={owners}
      companies={companies}
      contactOptions={contactOptions}
      stages={stages}
      sides={sides.map((s) => ({ value: s.value, label: s.label }))}
      contactRoles={contactRoles.map((r) => ({
        value: r.value,
        label: r.label,
      }))}
      customFieldDefs={customFieldDefs}
    />
  );
}
