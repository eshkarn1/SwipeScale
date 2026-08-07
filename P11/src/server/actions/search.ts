"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { searchWorkspace, type SearchHit } from "@/server/services/search";
import { requireWorkspace } from "@/server/tenancy";

/**
 * Backs the ⌘K palette. Thin, per BUILD_SPEC §8: `requireWorkspace()` ->
 * Zod parse -> service -> `{ ok, data }`.
 *
 * No `revalidatePath` — this reads, it does not mutate.
 *
 * `VIEWER` is the right floor: search must not reveal records to someone who
 * could not open them, and `requireWorkspace` already 404s a non-member
 * rather than 403ing, so a foreign slug leaks nothing about whether the
 * workspace exists.
 */
const searchSchema = z.object({
  // Bounded so a pathological paste cannot become an unindexed scan.
  q: z.string().trim().max(200),
});

export async function searchWorkspaceAction(
  workspaceSlug: string,
  input: unknown,
): Promise<ActionResult<SearchHit[]>> {
  const { workspace } = await requireWorkspace(workspaceSlug);

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid search.",
    };
  }

  try {
    const hits = await searchWorkspace(workspace.id, parsed.data.q);
    return { ok: true, data: hits };
  } catch (error) {
    console.error("[search] failed:", error);
    return { ok: false, error: "Search failed. Try again." };
  }
}
