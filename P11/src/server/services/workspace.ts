/**
 * Workspace lifecycle. `createWorkspaceForUser` is the "signup creates
 * Workspace + Membership(OWNER)" half of BUILD_SPEC §7.2 — see DECISIONS §9
 * for why `User` creation itself is not inside this same transaction.
 */
import { db } from "@/server/db";
import {
  DEFAULT_VERTICAL,
  getVerticalPreset,
} from "@/server/services/workspace-presets";
import { slugify } from "@/lib/slug";
import { isReservedSlug } from "@/lib/reserved-slugs";

import type { Prisma, Workspace } from "@/generated/prisma/client";

export interface CreateWorkspaceInput {
  userId: string;
  name: string;
  vertical?: string;
}

async function findAvailableSlug(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<string> {
  const root = slugify(name);
  let candidate = root;
  let suffix = 1;

  // Small, bounded loop: collisions on a freshly chosen slug are rare, and
  // this only runs once per workspace creation.
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (!isReservedSlug(candidate)) {
      const existing = await tx.workspace.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }

  // Astronomically unlikely with the loop above, but a hard failure here is
  // still better than silently truncating the collision search.
  throw new Error(`Could not find an available slug for "${name}".`);
}

/**
 * Creates a Workspace, its OWNER Membership for `userId`, the default
 * pipeline + stages, and the deal-contact-role / deal-side option lists —
 * all in one transaction, seeded from `getVerticalPreset`.
 *
 * `userId` must already exist (created by the Auth.js adapter during
 * sign-in) — this function does not create users.
 */
export async function createWorkspaceForUser(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const vertical = input.vertical ?? DEFAULT_VERTICAL;
  const preset = getVerticalPreset(vertical);

  return db.$transaction(async (tx) => {
    const slug = await findAvailableSlug(tx, input.name);

    const workspace = await tx.workspace.create({
      data: { name: input.name, slug, vertical },
    });

    await tx.membership.create({
      data: { userId: input.userId, workspaceId: workspace.id, role: "OWNER" },
    });

    const pipeline = await tx.pipeline.create({
      data: {
        workspaceId: workspace.id,
        name: preset.pipelineName,
        isDefault: true,
      },
    });

    if (preset.stages.length > 0) {
      await tx.stage.createMany({
        data: preset.stages.map((stage) => ({
          workspaceId: workspace.id,
          pipelineId: pipeline.id,
          name: stage.name,
          position: stage.position,
          probability: stage.probability,
          type: stage.type,
        })),
      });
    }

    const optionRows = [
      ...preset.dealContactRoles.map((option) => ({
        workspaceId: workspace.id,
        kind: "deal_contact_role",
        value: option.value,
        label: option.label,
        position: option.position,
      })),
      ...preset.dealSides.map((option) => ({
        workspaceId: workspace.id,
        kind: "deal_side",
        value: option.value,
        label: option.label,
        position: option.position,
      })),
    ];

    if (optionRows.length > 0) {
      await tx.workspaceOption.createMany({ data: optionRows });
    }

    return workspace;
  });
}

/** True if `userId` has zero workspace memberships — drives the onboarding
 * redirect after first sign-in. */
export async function hasNoWorkspaces(userId: string): Promise<boolean> {
  const count = await db.membership.count({ where: { userId } });
  return count === 0;
}

/** Every member of `workspaceId`, scoped by workspaceId like every other
 * tenant-scoped query in this codebase (BUILD_SPEC §5). */
export async function listMembers(workspaceId: string) {
  return db.membership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/** Invites still open (not accepted, not expired) for `workspaceId`. */
export async function listPendingInvites(workspaceId: string) {
  return db.invite.findMany({
    where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "asc" },
  });
}
