"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { createInvite, acceptInvite, InviteError } from "@/server/services/invite";
import {
  checkRateLimit,
  extractClientIp,
  RateLimitExceededError,
} from "@/server/rate-limit";
import { requireUser, requireWorkspace } from "@/server/tenancy";
import { canInvite } from "@/server/permissions";

const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export async function createInviteAction(
  workspaceSlug: string,
  input: unknown,
): Promise<ActionResult<{ email: string }>> {
  const { session, membership, workspace } = await requireWorkspace(
    workspaceSlug,
    "ADMIN",
  );

  if (!canInvite(membership.role)) {
    return { ok: false, error: "You don't have permission to invite people." };
  }

  const parsed = createInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const invite = await createInvite({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      inviterName: session.user.name ?? null,
      inviterRole: membership.role,
      email: parsed.data.email,
      role: parsed.data.role,
    });
    revalidatePath(`/${workspaceSlug}/settings/team`);
    return { ok: true, data: { email: invite.email } };
  } catch (error) {
    if (error instanceof InviteError) {
      return { ok: false, error: error.message };
    }
    console.error("[invite] create failed:", error);
    return { ok: false, error: "Couldn't create the invite. Try again." };
  }
}

const acceptInviteSchema = z.object({ token: z.string().trim().min(1) });

export async function acceptInviteAction(
  input: unknown,
): Promise<ActionResult<never>> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "This invite link looks broken." };
  }

  const ip = extractClientIp(await headers());
  try {
    await checkRateLimit(`invite-accept:${ip}`, 10);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const session = await requireUser();

  let workspaceSlug: string;
  try {
    const result = await acceptInvite(
      parsed.data.token,
      session.user.id,
      session.user.email ?? "",
    );
    workspaceSlug = result.workspaceSlug;
  } catch (error) {
    if (error instanceof InviteError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  // Outside the try/catch: `redirect()` throws a Next.js-internal signal
  // that a surrounding catch would otherwise intercept.
  redirect(`/${workspaceSlug}`);
}
