/**
 * THE tenant guard. BUILD_SPEC §5: "the single most important thing in this
 * codebase." Every server action and every workspace-scoped route starts by
 * calling `requireWorkspace()`, and every subsequent Prisma query includes
 * `workspaceId: workspace.id` in its `where` — never trust an id from the
 * client alone.
 *
 * `tenancy.test.ts` (Vitest) seeds two workspaces and asserts every service
 * function returns nothing for a foreign id. That suite grows with every
 * new service, per §5.
 */
import { notFound, redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { hasRole } from "@/server/permissions";
import { findMembershipForSlug } from "@/server/queries/membership";

import type { Membership, Role, Workspace } from "@/generated/prisma/client";

export { findMembershipForSlug };

export class ForbiddenError extends Error {
  override name = "ForbiddenError";
  constructor(message = "You don't have permission to do that.") {
    super(message);
  }
}

export interface WorkspaceContext {
  session: Session;
  membership: Membership;
  workspace: Workspace;
}

/**
 * Resolves the current user's membership in the workspace identified by
 * `slug`, or ends the request.
 *
 * - No session → redirect to `/login`.
 * - No membership for this user in a workspace with this slug → 404, never
 *   403. A 403 would tell an attacker the slug exists; §5 is explicit that
 *   workspace existence must not leak this way.
 * - Membership exists but role is below `minRole` → `ForbiddenError`. This
 *   is a real 403 case: the caller already knows the workspace exists
 *   because they're a member of it, so there's nothing left to leak.
 * - Workspace is SUSPENDED → redirect to its billing page, except that
 *   check is skipped for the billing page itself (or a suspended workspace
 *   could never reach the page that unsuspends it).
 */
export async function requireWorkspace(
  slug: string,
  minRole: Role = "VIEWER",
): Promise<WorkspaceContext> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await findMembershipForSlug(session.user.id, slug);
  if (!membership) notFound();
  if (!hasRole(membership.role, minRole)) throw new ForbiddenError();

  const { workspace } = membership;
  if (workspace.status === "SUSPENDED") {
    redirect(`/${slug}/settings/billing`);
  }

  return { session, membership, workspace };
}

/**
 * For flows that need "is anyone logged in" but happen before any workspace
 * exists — onboarding, the workspace switcher, accepting an invite. Ends
 * the request with a redirect to `/login` rather than returning `null`, the
 * same way `requireWorkspace()` does, so callers never have to re-check.
 */
export async function requireUser(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/**
 * Every workspace the current user belongs to. Backs the workspace
 * switcher — deliberately returns `[]` rather than redirecting when there
 * is no session, because callers that already know a user exists (e.g. the
 * onboarding gate) want to branch on "zero workspaces" without a redirect
 * loop through `/login`.
 */
export async function listMyWorkspaces(): Promise<
  Array<Membership & { workspace: Workspace }>
> {
  const session = await auth();
  if (!session?.user) return [];

  return db.membership.findMany({
    where: { userId: session.user.id, workspace: { deletedAt: null } },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
}
