/**
 * `SavedView` lifecycle (BUILD_SPEC §4/§7 M2). A saved view is nothing more
 * than a named, storable snapshot of a record list's URL search params —
 * `filters`/`sort`/`columns` are stored as opaque JSON exactly as the client
 * sends them, and replayed by navigating to those same params. This service
 * does not interpret them; `company.ts` / `contact.ts` / `deal.ts` are what
 * give the params meaning, so a saved view can never get out of sync with
 * what its list actually supports filtering on.
 */
import { db } from "@/server/db";

import type { Prisma, SavedView } from "@/generated/prisma/client";
import type { CustomFieldEntity } from "@/server/services/custom-field-def";

export class SavedViewError extends Error {
  override name = "SavedViewError";
}

export async function listSavedViews(
  workspaceId: string,
  entity: CustomFieldEntity,
): Promise<SavedView[]> {
  return db.savedView.findMany({
    where: { workspaceId, entity },
    orderBy: { name: "asc" },
  });
}

export async function getSavedView(
  workspaceId: string,
  id: string,
): Promise<SavedView | null> {
  return db.savedView.findFirst({ where: { id, workspaceId } });
}

export interface SavedViewInput {
  entity: CustomFieldEntity;
  name: string;
  filters?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  columns?: string[];
  isShared?: boolean;
}

export async function createSavedView(
  workspaceId: string,
  createdById: string | null,
  input: SavedViewInput,
): Promise<SavedView> {
  return db.savedView.create({
    data: {
      workspaceId,
      createdById,
      entity: input.entity,
      name: input.name,
      // Cast rather than re-typed as `Prisma.InputJsonValue` throughout:
      // `filters`/`sort` are deliberately opaque (see the file header) —
      // whatever shape `use-list-params.ts` serialises is valid here, this
      // service does not interpret it.
      filters: (input.filters ?? {}) as Prisma.InputJsonValue,
      sort: (input.sort ?? {}) as Prisma.InputJsonValue,
      columns: input.columns ?? [],
      isShared: input.isShared ?? false,
    },
  });
}

export async function updateSavedView(
  workspaceId: string,
  id: string,
  input: Partial<SavedViewInput>,
): Promise<SavedView> {
  const existing = await getSavedView(workspaceId, id);
  if (!existing) {
    throw new SavedViewError("That saved view doesn't exist.");
  }

  const data: Prisma.SavedViewUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.filters !== undefined)
    data.filters = input.filters as Prisma.InputJsonValue;
  if (input.sort !== undefined) data.sort = input.sort as Prisma.InputJsonValue;
  if (input.columns !== undefined) data.columns = input.columns;
  if (input.isShared !== undefined) data.isShared = input.isShared;

  return db.savedView.update({ where: { id: existing.id }, data });
}

export async function deleteSavedView(
  workspaceId: string,
  id: string,
): Promise<void> {
  await db.savedView.deleteMany({ where: { id, workspaceId } });
}
