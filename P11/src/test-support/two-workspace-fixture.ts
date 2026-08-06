/**
 * Shared fixture for cross-tenant tests. BUILD_SPEC §5: "Write a Vitest
 * suite `tenancy.test.ts` that seeds two workspaces and asserts that every
 * service function returns nothing for a foreign id. This suite must grow
 * with every new service." One fixture, reused by every such test file, so
 * "seed two workspaces" stays one implementation instead of drifting copies.
 *
 * Runs against a real Postgres database (`.env.test`, loaded by
 * `vitest.setup.ts`) rather than a mock — the thing under test is a Prisma
 * `where` clause, and a mock would only prove the mock was configured
 * correctly.
 */
import { randomUUID } from "node:crypto";

import { db } from "@/server/db";
import { createWorkspaceForUser } from "@/server/services/workspace";

import type { User, Workspace } from "@/generated/prisma/client";

export interface TwoWorkspaceFixture {
  workspaceA: Workspace; // vertical: real_estate
  workspaceB: Workspace; // vertical: general_b2b — the "does the seam work" workspace
  ownerA: User;
  ownerB: User;
}

export async function createTwoWorkspaceFixture(): Promise<TwoWorkspaceFixture> {
  const suffix = randomUUID();

  const [ownerA, ownerB] = await Promise.all([
    db.user.create({
      data: { email: `owner-a-${suffix}@test.lightline.invalid`, name: "Owner A" },
    }),
    db.user.create({
      data: { email: `owner-b-${suffix}@test.lightline.invalid`, name: "Owner B" },
    }),
  ]);

  const workspaceA = await createWorkspaceForUser({
    userId: ownerA.id,
    name: `Workspace A ${suffix}`,
    vertical: "real_estate",
  });
  const workspaceB = await createWorkspaceForUser({
    userId: ownerB.id,
    name: `Workspace B ${suffix}`,
    vertical: "general_b2b",
  });

  return { workspaceA, workspaceB, ownerA, ownerB };
}

export async function destroyTwoWorkspaceFixture(
  fixture: TwoWorkspaceFixture,
): Promise<void> {
  // Cascades to memberships, options, pipelines, stages, invites, etc.
  await db.workspace.deleteMany({
    where: { id: { in: [fixture.workspaceA.id, fixture.workspaceB.id] } },
  });
  await db.user.deleteMany({
    where: { id: { in: [fixture.ownerA.id, fixture.ownerB.id] } },
  });
}
