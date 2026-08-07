import type { Metadata } from "next";

import { requireWorkspace } from "@/server/tenancy";
import {
  CONTACT_DEFAULT_SORT,
  CONTACT_SORT_FIELDS,
  listContacts,
} from "@/server/services/contact";
import { listCompanyOptions } from "@/server/services/company";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import { listSavedViews } from "@/server/services/saved-view";
import { listMembers } from "@/server/services/workspace";
import { parseSortParam } from "@/lib/pagination";

import { ContactsClient } from "./contacts-client";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({
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

  const sort = parseSortParam(
    one(sp.sort),
    CONTACT_SORT_FIELDS,
    CONTACT_DEFAULT_SORT,
  );

  const [data, companies, members, customFieldDefs, savedViews] =
    await Promise.all([
      listContacts(workspace.id, {
        q: one(sp.q),
        companyId: one(sp.companyId),
        ownerId: one(sp.owner),
        deleted: one(sp.deleted) === "1",
        sort,
        after: one(sp.after),
        before: one(sp.before),
      }),
      listCompanyOptions(workspace.id),
      listMembers(workspace.id),
      listCustomFieldDefs(workspace.id, "contact"),
      listSavedViews(workspace.id, "contact"),
    ]);

  const owners = members.map((m) => ({
    id: m.id,
    label: m.user.name ?? m.user.email,
  }));

  return (
    <ContactsClient
      workspaceSlug={slug}
      data={data}
      companies={companies}
      owners={owners}
      customFieldDefs={customFieldDefs}
      savedViews={savedViews}
    />
  );
}
