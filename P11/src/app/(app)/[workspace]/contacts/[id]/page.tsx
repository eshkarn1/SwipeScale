import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireWorkspace } from "@/server/tenancy";
import { getContact, listDealsForContact } from "@/server/services/contact";
import { listCompanyOptions } from "@/server/services/company";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import { listMembers } from "@/server/services/workspace";
import { listWorkspaceOptions } from "@/server/queries/workspace-options";
import { serializeDeal } from "@/lib/serialize";

import { ContactDetailClient } from "./contact-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}): Promise<Metadata> {
  const { workspace: slug, id } = await params;
  const { workspace } = await requireWorkspace(slug);
  const contact = await getContact(workspace.id, id);
  return {
    title: contact
      ? `${contact.firstName} ${contact.lastName ?? ""}`.trim()
      : "Contact",
  };
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const { workspace } = await requireWorkspace(slug);

  const contact = await getContact(workspace.id, id);
  if (!contact) notFound();

  const [dealLinks, companies, customFieldDefs, members, roleOptions] =
    await Promise.all([
      listDealsForContact(workspace.id, contact.id),
      listCompanyOptions(workspace.id),
      listCustomFieldDefs(workspace.id, "contact"),
      listMembers(workspace.id),
      listWorkspaceOptions(workspace.id, "deal_contact_role"),
    ]);

  const owners = members.map((m) => ({
    id: m.id,
    label: m.user.name ?? m.user.email,
  }));
  const ownerLabel = contact.ownerId
    ? (owners.find((o) => o.id === contact.ownerId)?.label ?? null)
    : null;
  const roleLabels = Object.fromEntries(
    roleOptions.map((o) => [o.value, o.label]),
  );

  return (
    <ContactDetailClient
      workspaceSlug={slug}
      contact={contact}
      ownerLabel={ownerLabel}
      owners={owners}
      companies={companies}
      customFieldDefs={customFieldDefs}
      deals={dealLinks.map((dc) => ({
        deal: serializeDeal(dc.deal),
        role: dc.role,
        isPrimary: dc.isPrimary,
      }))}
      roleLabels={roleLabels}
    />
  );
}
