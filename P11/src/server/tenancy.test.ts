/**
 * BUILD_SPEC §5: seeds two workspaces, asserts every service function
 * returns nothing for a foreign id. Grows with every new service — the
 * fixture lives in `src/test-support/two-workspace-fixture.ts` specifically
 * so the next service's test file reuses it instead of re-seeding.
 *
 * Every `it.skipIf` below is the same guard: this suite needs a live
 * Postgres (`DATABASE_URL` from `.env.test`), and a missing database should
 * report as "skipped, see docs/local-database.md", not as 46 cryptic
 * connection-refused failures.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// `createInvite` sends a real email. Mocked so this suite tests Prisma
// scoping, not mail delivery — and so it never has to load
// `src/server/email.tsx`, whose JSX Vite's dev-only `client-inject` plugin
// cannot currently transform standalone (unrelated to this codebase: an
// `oxc transform error` in Vite 8's `replaceDefine` step). `vi.mock` calls
// are hoisted above the imports below by Vitest regardless of where they're
// written, so this runs before `@/server/services/invite` is ever loaded.
vi.mock("@/server/email", () => ({
  sendInviteEmail: vi.fn(async () => undefined),
  sendMagicLinkEmail: vi.fn(async () => undefined),
}));

import { db } from "@/server/db";
import { findMembershipForSlug } from "@/server/queries/membership";
import { hasNoWorkspaces, listMembers, listPendingInvites } from "@/server/services/workspace";
import { acceptInvite, createInvite, getInvitePreview, InviteError } from "@/server/services/invite";
import {
  createTwoWorkspaceFixture,
  destroyTwoWorkspaceFixture,
  type TwoWorkspaceFixture,
} from "@/test-support/two-workspace-fixture";

let fixture: TwoWorkspaceFixture | null = null;
let dbAvailable = true;

beforeAll(async () => {
  try {
    fixture = await createTwoWorkspaceFixture();
  } catch (error) {
    dbAvailable = false;
    console.warn(
      "[tenancy.test.ts] Could not reach the test database — skipping. " +
        "See docs/local-database.md.",
      error,
    );
  }
});

afterAll(async () => {
  if (fixture) await destroyTwoWorkspaceFixture(fixture);
  await db.$disconnect();
});

describe("findMembershipForSlug", () => {
  it.skipIf(!dbAvailable)(
    "resolves a user's own workspace (positive control)",
    async () => {
      const f = fixture!;
      const membership = await findMembershipForSlug(f.ownerA.id, f.workspaceA.slug);
      expect(membership?.workspaceId).toBe(f.workspaceA.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "returns null for a workspace the user is not a member of",
    async () => {
      const f = fixture!;
      expect(await findMembershipForSlug(f.ownerA.id, f.workspaceB.slug)).toBeNull();
      expect(await findMembershipForSlug(f.ownerB.id, f.workspaceA.slug)).toBeNull();
    },
  );
});

describe("workspace service", () => {
  it.skipIf(!dbAvailable)(
    "createWorkspaceForUser scopes its preset rows (pipeline, stages) per workspace",
    async () => {
      const f = fixture!;
      const stagesA = await db.stage.findMany({ where: { workspaceId: f.workspaceA.id } });
      const stagesB = await db.stage.findMany({ where: { workspaceId: f.workspaceB.id } });

      // Positive control: each workspace actually got its own preset.
      expect(stagesA.map((s) => s.name)).toContain("Lead"); // real_estate preset
      expect(stagesB.map((s) => s.name)).toContain("New Lead"); // general_b2b preset

      // Cross-tenant: neither workspace's stages leak into a query scoped to
      // the other.
      expect(stagesA.some((s) => s.workspaceId !== f.workspaceA.id)).toBe(false);
      expect(stagesB.some((s) => s.name === "Lead")).toBe(false);
    },
  );

  it.skipIf(!dbAvailable)(
    "the general_b2b preset seeds no deal_side options — proves the vertical seam needs no schema change",
    async () => {
      const f = fixture!;
      const sidesA = await db.workspaceOption.findMany({
        where: { workspaceId: f.workspaceA.id, kind: "deal_side" },
      });
      const sidesB = await db.workspaceOption.findMany({
        where: { workspaceId: f.workspaceB.id, kind: "deal_side" },
      });
      expect(sidesA.length).toBeGreaterThan(0);
      expect(sidesB.length).toBe(0);
    },
  );

  it.skipIf(!dbAvailable)(
    "listMembers(workspaceId) never returns another workspace's members",
    async () => {
      const f = fixture!;
      const membersA = await listMembers(f.workspaceA.id);
      const membersB = await listMembers(f.workspaceB.id);

      expect(membersA.map((m) => m.userId)).toContain(f.ownerA.id);
      expect(membersA.map((m) => m.userId)).not.toContain(f.ownerB.id);
      expect(membersB.map((m) => m.userId)).toContain(f.ownerB.id);
      expect(membersB.map((m) => m.userId)).not.toContain(f.ownerA.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "hasNoWorkspaces is false for a seeded owner, true for an unrelated user",
    async () => {
      const f = fixture!;
      expect(await hasNoWorkspaces(f.ownerA.id)).toBe(false);
      expect(await hasNoWorkspaces("a-user-id-that-does-not-exist")).toBe(true);
    },
  );
});

describe("invite service", () => {
  it.skipIf(!dbAvailable)(
    "getInvitePreview only ever exposes the inviting workspace, never the other one",
    async () => {
      const f = fixture!;
      const invite = await createInvite({
        workspaceId: f.workspaceA.id,
        workspaceName: f.workspaceA.name,
        inviterName: "Owner A",
        inviterRole: "OWNER",
        email: `invitee-${crypto.randomUUID()}@test.lightline.invalid`,
        role: "MEMBER",
      });

      const preview = await getInvitePreview(invite.token);
      expect(preview?.workspaceSlug).toBe(f.workspaceA.slug);
      expect(preview?.workspaceSlug).not.toBe(f.workspaceB.slug);
    },
  );

  it.skipIf(!dbAvailable)(
    "listPendingInvites(workspaceId) does not leak a foreign workspace's invite",
    async () => {
      const f = fixture!;
      const invite = await createInvite({
        workspaceId: f.workspaceA.id,
        workspaceName: f.workspaceA.name,
        inviterName: "Owner A",
        inviterRole: "OWNER",
        email: `invitee2-${crypto.randomUUID()}@test.lightline.invalid`,
        role: "VIEWER",
      });

      const invitesA = await listPendingInvites(f.workspaceA.id);
      const invitesB = await listPendingInvites(f.workspaceB.id);

      expect(invitesA.map((i) => i.id)).toContain(invite.id);
      expect(invitesB.map((i) => i.id)).not.toContain(invite.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "acceptInvite grants membership only in the invite's own workspace",
    async () => {
      const f = fixture!;
      const email = `acceptor-${crypto.randomUUID()}@test.lightline.invalid`;
      const invite = await createInvite({
        workspaceId: f.workspaceA.id,
        workspaceName: f.workspaceA.name,
        inviterName: "Owner A",
        inviterRole: "OWNER",
        email,
        role: "MEMBER",
      });

      const acceptor = await db.user.create({ data: { email, name: "Acceptor" } });
      const result = await acceptInvite(invite.token, acceptor.id, email);
      expect(result.workspaceSlug).toBe(f.workspaceA.slug);

      const membershipInA = await db.membership.findFirst({
        where: { userId: acceptor.id, workspaceId: f.workspaceA.id },
      });
      const membershipInB = await db.membership.findFirst({
        where: { userId: acceptor.id, workspaceId: f.workspaceB.id },
      });
      expect(membershipInA).not.toBeNull();
      expect(membershipInB).toBeNull();

      await db.membership.deleteMany({ where: { userId: acceptor.id } });
      await db.user.delete({ where: { id: acceptor.id } });
    },
  );

  it.skipIf(!dbAvailable)(
    "acceptInvite refuses an email that doesn't match the invite",
    async () => {
      const f = fixture!;
      const invite = await createInvite({
        workspaceId: f.workspaceA.id,
        workspaceName: f.workspaceA.name,
        inviterName: "Owner A",
        inviterRole: "OWNER",
        email: `mismatch-${crypto.randomUUID()}@test.lightline.invalid`,
        role: "MEMBER",
      });

      await expect(
        acceptInvite(invite.token, f.ownerB.id, "someone-else@test.lightline.invalid"),
      ).rejects.toThrow(InviteError);
    },
  );
});
