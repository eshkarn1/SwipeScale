import type { Metadata } from "next";

import { requireWorkspace } from "@/server/tenancy";
import {
  isDealSortField,
  listDeals,
  listDefaultPipelineStages,
} from "@/server/services/deal";
import { listCompanyOptions } from "@/server/services/company";
import { listContactOptions } from "@/server/services/contact";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import { listSavedViews } from "@/server/services/saved-view";
import { listMembers } from "@/server/services/workspace";
import { listWorkspaceOptions } from "@/server/queries/workspace-options";
import { serializeDeal } from "@/lib/serialize";

import { DealsClient } from "./deals-client";

export const metadata: Metadata = { title: "Deals" };

export default async function DealsPage({
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

  const [
    data,
    stages,
    companies,
    contacts,
    members,
    customFieldDefs,
    savedViews,
    sides,
    contactRoles,
  ] = await Promise.all([
    listDeals(workspace.id, {
      q: one(sp.q),
      stageId: one(sp.stageId),
      side: one(sp.side),
      deleted: one(sp.deleted) === "1",
      sort: sortParam && isDealSortField(sortParam) ? sortParam : undefined,
      dir: dirParam === "asc" ? "asc" : "desc",
      page: one(sp.page) ? Number(one(sp.page)) : undefined,
    }),
    listDefaultPipelineStages(workspace.id),
    listCompanyOptions(workspace.id),
    listContactOptions(workspace.id),
    listMembers(workspace.id),
    listCustomFieldDefs(workspace.id, "deal"),
    listSavedViews(workspace.id, "deal"),
    listWorkspaceOptions(workspace.id, "deal_side"),
    listWorkspaceOptions(workspace.id, "deal_contact_role"),
  ]);

  const owners = members.map((m) => ({
    id: m.id,
    label: m.user.name ?? m.user.email,
  }));
  const contactOptions = contacts.map((c) => ({
    id: c.id,
    label: `${c.firstName} ${c.lastName ?? ""}`.trim(),
  }));
  const serializedData = { ...data, items: data.items.map(serializeDeal) };

  return (
    <DealsClient
      workspaceSlug={slug}
      data={serializedData}
      stages={stages}
      owners={owners}
      companies={companies}
      contactOptions={contactOptions}
      sides={sides.map((s) => ({ value: s.value, label: s.label }))}
      contactRoles={contactRoles.map((r) => ({
        value: r.value,
        label: r.label,
      }))}
      customFieldDefs={customFieldDefs}
      savedViews={savedViews}
    />
  );
}
