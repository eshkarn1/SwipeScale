"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { createWorkspaceForUser } from "@/server/services/workspace";
import { requireUser } from "@/server/tenancy";
import { isVerticalKey } from "@/server/services/workspace-presets";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Name it something you'll recognise.").max(80),
  vertical: z.string().trim().optional(),
});

/**
 * Onboarding: the Workspace + Membership(OWNER) half of BUILD_SPEC §7.2 —
 * see `createWorkspaceForUser` and DECISIONS §9 for why User creation is
 * not part of this same transaction.
 */
export async function createWorkspaceAction(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const session = await requireUser();

  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  if (parsed.data.vertical && !isVerticalKey(parsed.data.vertical)) {
    return { ok: false, error: "Unknown vertical." };
  }

  try {
    const workspace = await createWorkspaceForUser({
      userId: session.user.id,
      name: parsed.data.name,
      vertical: parsed.data.vertical,
    });
    return { ok: true, data: { slug: workspace.slug } };
  } catch (error) {
    console.error("[workspace] create failed:", error);
    return { ok: false, error: "Couldn't create the workspace. Try again." };
  }
}

/** Thin wrapper so the onboarding form can `redirect` on success without the
 * caller having to branch on the action result first. */
export async function createWorkspaceAndRedirectAction(
  input: unknown,
): Promise<ActionResult<never>> {
  const result = await createWorkspaceAction(input);
  if (!result.ok) return result;
  redirect(`/${result.data.slug}`);
}
