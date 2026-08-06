/**
 * The one query that decides whether a user can see a workspace at all —
 * lives in its own leaf module, with no import of `@/server/auth`, on
 * purpose. `@/server/auth` pulls in `next-auth` and its OAuth/email
 * providers, which in turn import `next/server`; that chain only resolves
 * inside a real Next.js build/runtime. Vitest (Node, via Vite's resolver)
 * cannot load it, so `tenancy.test.ts` — which needs exactly this query and
 * nothing else from `tenancy.ts` — imports it from here instead of
 * dragging the whole auth stack into a unit test.
 */
import { db } from "@/server/db";

import type { Membership, Workspace } from "@/generated/prisma/client";

export async function findMembershipForSlug(
  userId: string,
  slug: string,
): Promise<(Membership & { workspace: Workspace }) | null> {
  return db.membership.findFirst({
    where: { userId, workspace: { slug, deletedAt: null } },
    include: { workspace: true },
  });
}
