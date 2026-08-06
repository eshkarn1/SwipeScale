"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import {
  CustomFieldDefError,
  createCustomFieldDef,
  deleteCustomFieldDef,
  updateCustomFieldDef,
  CUSTOM_FIELD_ENTITIES,
} from "@/server/services/custom-field-def";
import { canManageCustomFields } from "@/server/permissions";
import { requireWorkspace } from "@/server/tenancy";

import type { CustomFieldDef } from "@/generated/prisma/client";

const FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "CURRENCY",
  "DATE",
  "SELECT",
  "MULTISELECT",
  "BOOLEAN",
  "URL",
] as const;

const createSchema = z.object({
  entity: z.enum(CUSTOM_FIELD_ENTITIES),
  key: z.string().trim().min(1).max(50),
  label: z.string().trim().min(1, "Label is required.").max(80),
  type: z.enum(FIELD_TYPES),
  options: z.array(z.string().trim().min(1)).max(50).optional(),
  position: z.number().int().min(0).optional(),
});

export async function createCustomFieldDefAction(
  workspaceSlug: string,
  input: unknown,
): Promise<ActionResult<CustomFieldDef>> {
  const { workspace, membership } = await requireWorkspace(
    workspaceSlug,
    "ADMIN",
  );
  if (!canManageCustomFields(membership.role)) {
    return {
      ok: false,
      error: "You don't have permission to manage custom fields.",
    };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const def = await createCustomFieldDef(workspace.id, parsed.data);
    revalidatePath(`/${workspaceSlug}/settings/fields`);
    return { ok: true, data: def };
  } catch (error) {
    if (error instanceof CustomFieldDefError) {
      return { ok: false, error: error.message };
    }
    console.error("[custom-field] create failed:", error);
    return { ok: false, error: "Couldn't create the field. Try again." };
  }
}

const updateSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  options: z.array(z.string().trim().min(1)).max(50).optional().nullable(),
  position: z.number().int().min(0).optional(),
});

export async function updateCustomFieldDefAction(
  workspaceSlug: string,
  id: string,
  input: unknown,
): Promise<ActionResult<CustomFieldDef>> {
  const { workspace, membership } = await requireWorkspace(
    workspaceSlug,
    "ADMIN",
  );
  if (!canManageCustomFields(membership.role)) {
    return {
      ok: false,
      error: "You don't have permission to manage custom fields.",
    };
  }

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const def = await updateCustomFieldDef(workspace.id, id, parsed.data);
    revalidatePath(`/${workspaceSlug}/settings/fields`);
    return { ok: true, data: def };
  } catch (error) {
    if (error instanceof CustomFieldDefError) {
      return { ok: false, error: error.message };
    }
    console.error("[custom-field] update failed:", error);
    return { ok: false, error: "Couldn't update the field. Try again." };
  }
}

export async function deleteCustomFieldDefAction(
  workspaceSlug: string,
  id: string,
): Promise<ActionResult<null>> {
  const { workspace, membership } = await requireWorkspace(
    workspaceSlug,
    "ADMIN",
  );
  if (!canManageCustomFields(membership.role)) {
    return {
      ok: false,
      error: "You don't have permission to manage custom fields.",
    };
  }

  await deleteCustomFieldDef(workspace.id, id);
  revalidatePath(`/${workspaceSlug}/settings/fields`);
  return { ok: true, data: null };
}
