/**
 * `CustomFieldDef` lifecycle (BUILD_SPEC §4). A workspace's own field
 * vocabulary for `company` / `contact` / `deal` — the mechanism that lets a
 * non-real-estate workspace add fields the schema never anticipated,
 * without a migration. Deleting a definition is a hard delete: nothing else
 * in the schema holds a foreign key to `CustomFieldDef.id` (values live as
 * plain JSON keyed by `.key` on the record itself), so a delete here only
 * stops the field appearing in new forms — historical values already
 * written stay in `customFields` untouched, same trade-off the model's own
 * doc comment makes for `WorkspaceOption`.
 */
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

import type { CustomFieldDef, FieldType } from "@/generated/prisma/client";

export class CustomFieldDefError extends Error {
  override name = "CustomFieldDefError";
}

export const CUSTOM_FIELD_ENTITIES = ["company", "contact", "deal"] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

export function isCustomFieldEntity(value: string): value is CustomFieldEntity {
  return (CUSTOM_FIELD_ENTITIES as readonly string[]).includes(value);
}

const KEY_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

export async function listCustomFieldDefs(
  workspaceId: string,
  entity?: CustomFieldEntity,
): Promise<CustomFieldDef[]> {
  return db.customFieldDef.findMany({
    where: { workspaceId, ...(entity ? { entity } : {}) },
    orderBy: [{ entity: "asc" }, { position: "asc" }],
  });
}

export interface CreateCustomFieldDefInput {
  entity: CustomFieldEntity;
  key: string;
  label: string;
  type: FieldType;
  options?: string[] | null;
  position?: number;
}

export async function createCustomFieldDef(
  workspaceId: string,
  input: CreateCustomFieldDefInput,
): Promise<CustomFieldDef> {
  if (!KEY_PATTERN.test(input.key)) {
    throw new CustomFieldDefError(
      "Key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.",
    );
  }
  if (
    (input.type === "SELECT" || input.type === "MULTISELECT") &&
    !input.options?.length
  ) {
    throw new CustomFieldDefError(
      `${input.type === "SELECT" ? "Select" : "Multi-select"} fields need at least one option.`,
    );
  }

  try {
    return await db.customFieldDef.create({
      data: {
        workspaceId,
        entity: input.entity,
        key: input.key,
        label: input.label,
        type: input.type,
        options: input.options ?? Prisma.JsonNull,
        position: input.position ?? 0,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new CustomFieldDefError(
        `A field with key "${input.key}" already exists for ${input.entity}.`,
      );
    }
    throw error;
  }
}

export interface UpdateCustomFieldDefInput {
  label?: string;
  options?: string[] | null;
  position?: number;
}

/** `key`, `type`, and `entity` are immutable after creation — changing the
 * type out from under already-written values would silently corrupt data
 * that `parseCustomFieldValues` can no longer make sense of. */
export async function updateCustomFieldDef(
  workspaceId: string,
  id: string,
  input: UpdateCustomFieldDefInput,
): Promise<CustomFieldDef> {
  const existing = await db.customFieldDef.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    throw new CustomFieldDefError("That custom field doesn't exist.");
  }

  const nextType = existing.type;
  const nextOptions = input.options !== undefined ? input.options : undefined;
  if (
    (nextType === "SELECT" || nextType === "MULTISELECT") &&
    nextOptions !== undefined &&
    nextOptions?.length === 0
  ) {
    throw new CustomFieldDefError(
      `${nextType === "SELECT" ? "Select" : "Multi-select"} fields need at least one option.`,
    );
  }

  return db.customFieldDef.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.options !== undefined
        ? { options: input.options ?? Prisma.JsonNull }
        : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
  });
}

/** Scoped `id + workspaceId` per BUILD_SPEC §5 — returns quietly (no throw)
 * if the def doesn't belong to this workspace, matching the delete
 * semantics used elsewhere in this codebase (a foreign id is simply not
 * found, never a signal about what does exist). */
export async function deleteCustomFieldDef(
  workspaceId: string,
  id: string,
): Promise<void> {
  await db.customFieldDef.deleteMany({ where: { id, workspaceId } });
}
