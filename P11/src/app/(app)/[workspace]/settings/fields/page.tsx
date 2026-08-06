import type { Metadata } from "next";

import { requireWorkspace } from "@/server/tenancy";
import {
  CUSTOM_FIELD_ENTITIES,
  listCustomFieldDefs,
} from "@/server/services/custom-field-def";

import { FieldsSettingsClient } from "./fields-client";

export const metadata: Metadata = { title: "Custom fields" };

/**
 * A workspace's field vocabulary is a shared, structural setting — every
 * member's create/edit forms change when it does — so, like the pattern
 * `permissions.ts` already sets for inviting members, this whole page
 * requires ADMIN rather than gating individual controls within a page every
 * member can load.
 */
export default async function FieldsSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireWorkspace(slug, "ADMIN");

  const defs = await listCustomFieldDefs(workspace.id);
  const byEntity = Object.fromEntries(
    CUSTOM_FIELD_ENTITIES.map((entity) => [
      entity,
      defs.filter((d) => d.entity === entity),
    ]),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Custom fields</h1>
      <p className="text-fg-muted mb-8 text-sm">
        Add fields to companies, contacts, and deals beyond the built-in ones.
      </p>
      <FieldsSettingsClient workspaceSlug={slug} defsByEntity={byEntity} />
    </div>
  );
}
