"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import {
  SavedViewError,
  createSavedView,
  deleteSavedView,
} from "@/server/services/saved-view";
import { CUSTOM_FIELD_ENTITIES } from "@/server/services/custom-field-def";
import { requireWorkspace } from "@/server/tenancy";

import type { SavedView } from "@/generated/prisma/client";

const ENTITY_PATH: Record<(typeof CUSTOM_FIELD_ENTITIES)[number], string> = {
  company: "companies",
  contact: "contacts",
  deal: "deals",
};

const createSchema = z.object({
  entity: z.enum(CUSTOM_FIELD_ENTITIES),
  name: z.string().trim().min(1, "Name is required.").max(80),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort: z.record(z.string(), z.unknown()).optional(),
  isShared: z.boolean().optional(),
});

export async function createSavedViewAction(
  workspaceSlug: string,
  input: unknown,
): Promise<ActionResult<SavedView>> {
  const { workspace, membership } = await requireWorkspace(
    workspaceSlug,
    "MEMBER",
  );

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const view = await createSavedView(
      workspace.id,
      membership.id,
      parsed.data,
    );
    revalidatePath(`/${workspaceSlug}/${ENTITY_PATH[parsed.data.entity]}`);
    return { ok: true, data: view };
  } catch (error) {
    if (error instanceof SavedViewError) {
      return { ok: false, error: error.message };
    }
    console.error("[saved-view] create failed:", error);
    return { ok: false, error: "Couldn't save the view. Try again." };
  }
}

export async function deleteSavedViewAction(
  workspaceSlug: string,
  id: string,
  entity: (typeof CUSTOM_FIELD_ENTITIES)[number],
): Promise<ActionResult<null>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");
  await deleteSavedView(workspace.id, id);
  revalidatePath(`/${workspaceSlug}/${ENTITY_PATH[entity]}`);
  return { ok: true, data: null };
}
