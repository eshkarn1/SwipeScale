import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireWorkspace } from "@/server/tenancy";
import { getDeal, listDefaultPipelineStages } from "@/server/services/deal";
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

  return (
    <DealDetailClient
      workspaceSlug={slug}
      deal={serializeDeal(deal)}
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
