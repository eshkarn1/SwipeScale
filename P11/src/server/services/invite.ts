/**
 * Invite lifecycle — create, look up, accept. Every write here is scoped by
 * `workspaceId`; callers are responsible for having already proven (via
 * `requireWorkspace()`) that the acting user belongs to that workspace and
 * holds `inviterRole`. This file does not re-derive membership itself so
 * there is exactly one place that check lives (BUILD_SPEC §5).
 */
import { randomBytes } from "node:crypto";

import { siteUrl } from "@/config/brand";
import { sendInviteEmail } from "@/server/email";
import { canGrantRole } from "@/server/permissions";
import { db } from "@/server/db";

import type { Invite, Role } from "@/generated/prisma/client";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class InviteError extends Error {
  override name = "InviteError";
}

export interface CreateInviteInput {
  workspaceId: string;
  workspaceName: string;
  inviterName: string | null;
  inviterRole: Role;
  email: string;
  role: Role;
}

export async function createInvite(input: CreateInviteInput): Promise<Invite> {
  const email = input.email.trim().toLowerCase();

  if (!canGrantRole(input.inviterRole, input.role)) {
    throw new InviteError(
      "You can't invite someone to a role higher than your own.",
    );
  }

  const existingMembership = await db.membership.findFirst({
    where: { workspaceId: input.workspaceId, user: { email } },
  });
  if (existingMembership) {
    throw new InviteError("This person is already a member of this workspace.");
  }

  const token = randomBytes(32).toString("hex");
  const invite = await db.invite.create({
    data: {
      workspaceId: input.workspaceId,
      email,
      role: input.role,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  await sendInviteEmail({
    to: email,
    workspaceName: input.workspaceName,
    inviterName: input.inviterName,
    acceptUrl: `${siteUrl()}/join/${token}`,
  });

  return invite;
}

export interface InvitePreview {
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  role: Role;
  isExpired: boolean;
  isAccepted: boolean;
}

/**
 * Public-ish lookup for the `/join/[token]` page — shown before the visitor
 * has necessarily signed in. Returns only what's needed to render "you're
 * invited to X as Y", nothing that identifies the workspace beyond its own
 * name (which the invite email already disclosed to this exact address).
 */
export async function getInvitePreview(
  token: string,
): Promise<InvitePreview | null> {
  const invite = await db.invite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true, slug: true, deletedAt: true } } },
  });
  if (!invite || invite.workspace.deletedAt) return null;

  return {
    workspaceName: invite.workspace.name,
    workspaceSlug: invite.workspace.slug,
    email: invite.email,
    role: invite.role,
    isExpired: invite.expiresAt < new Date(),
    isAccepted: invite.acceptedAt !== null,
  };
}

export interface AcceptInviteResult {
  workspaceSlug: string;
}

/**
 * Accepting an invite is the one place a user's Membership is created by
 * something other than `createWorkspaceForUser` — mirrors it by doing the
 * membership write and the invite's `acceptedAt` stamp in one transaction,
 * so a crash between them can never leave a "used" invite that granted
 * nothing, or a membership with no record of how it was granted.
 */
export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string,
): Promise<AcceptInviteResult> {
  const invite = await db.invite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite || invite.workspace.deletedAt) {
    throw new InviteError("This invite is invalid.");
  }
  if (invite.acceptedAt) {
    throw new InviteError("This invite has already been used.");
  }
  if (invite.expiresAt < new Date()) {
    throw new InviteError("This invite has expired.");
  }
  if (invite.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    throw new InviteError(
      "This invite was sent to a different email address.",
    );
  }

  await db.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: {
        userId_workspaceId: { userId, workspaceId: invite.workspaceId },
      },
      create: { userId, workspaceId: invite.workspaceId, role: invite.role },
      update: {},
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return { workspaceSlug: invite.workspace.slug };
}
