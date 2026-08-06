/**
 * Reads for `WorkspaceOption` (DECISIONS §8.6) — the workspace-editable
 * vocabularies (`deal_side`, `deal_contact_role`, …) that keep vertical
 * words out of the schema and out of components. Every record-facing
 * service that validates a `value` against one of these lists reads it from
 * here rather than re-querying inline, so there is one place that knows the
 * shape.
 */
import { db } from "@/server/db";

import type { WorkspaceOption } from "@/generated/prisma/client";

/** Active (non-archived) options for one `kind`, in display order. Archived
 * options are deliberately excluded — they stay resolvable for existing
 * records (see the model's own doc comment) but must not appear as a
 * choice for a new one. */
export async function listWorkspaceOptions(
  workspaceId: string,
  kind: string,
): Promise<WorkspaceOption[]> {
  return db.workspaceOption.findMany({
    where: { workspaceId, kind, isArchived: false },
    orderBy: { position: "asc" },
  });
}

/**
 * True if `value` is a currently-active option of `kind` in this workspace.
 * A workspace with zero options for `kind` (e.g. `general_b2b`'s empty
 * `deal_side` list) has no vocabulary for the field at all, so nothing
 * validates — the field stays `null` forever for that workspace, it does
 * not silently accept an arbitrary string. Callers only call this when
 * `value` is non-null; a null value never needs validating.
 */
export async function isValidWorkspaceOption(
  workspaceId: string,
  kind: string,
  value: string,
): Promise<boolean> {
  const options = await listWorkspaceOptions(workspaceId, kind);
  return options.some((option) => option.value === value);
}
