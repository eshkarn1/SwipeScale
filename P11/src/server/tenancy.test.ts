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
import {
  hasNoWorkspaces,
  listMembers,
  listPendingInvites,
} from "@/server/services/workspace";
import {
  acceptInvite,
  createInvite,
  getInvitePreview,
  InviteError,
} from "@/server/services/invite";
import {
  CompanyError,
  createCompany,
  getCompany,
  listCompanies,
  softDeleteCompany,
  restoreCompany,
  updateCompany,
} from "@/server/services/company";
import {
  ContactError,
  createContact,
  getContact,
  softDeleteContact,
  updateContact,
} from "@/server/services/contact";
import {
  DealError,
  createDeal,
  getDeal,
  listDefaultPipelineStages,
  softDeleteDeal,
  restoreDeal,
  updateDeal,
} from "@/server/services/deal";
import {
  CustomFieldDefError,
  createCustomFieldDef,
  deleteCustomFieldDef,
  listCustomFieldDefs,
} from "@/server/services/custom-field-def";
import {
  createSavedView,
  deleteSavedView,
  getSavedView,
  listSavedViews,
} from "@/server/services/saved-view";
import { CustomFieldError } from "@/lib/custom-fields";
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
      const membership = await findMembershipForSlug(
        f.ownerA.id,
        f.workspaceA.slug,
      );
      expect(membership?.workspaceId).toBe(f.workspaceA.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "returns null for a workspace the user is not a member of",
    async () => {
      const f = fixture!;
      expect(
        await findMembershipForSlug(f.ownerA.id, f.workspaceB.slug),
      ).toBeNull();
      expect(
        await findMembershipForSlug(f.ownerB.id, f.workspaceA.slug),
      ).toBeNull();
    },
  );
});

describe("workspace service", () => {
  it.skipIf(!dbAvailable)(
    "createWorkspaceForUser scopes its preset rows (pipeline, stages) per workspace",
    async () => {
      const f = fixture!;
      const stagesA = await db.stage.findMany({
        where: { workspaceId: f.workspaceA.id },
      });
      const stagesB = await db.stage.findMany({
        where: { workspaceId: f.workspaceB.id },
      });

      // Positive control: each workspace actually got its own preset.
      expect(stagesA.map((s) => s.name)).toContain("Lead"); // real_estate preset
      expect(stagesB.map((s) => s.name)).toContain("New Lead"); // general_b2b preset

      // Cross-tenant: neither workspace's stages leak into a query scoped to
      // the other.
      expect(stagesA.some((s) => s.workspaceId !== f.workspaceA.id)).toBe(
        false,
      );
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

      const acceptor = await db.user.create({
        data: { email, name: "Acceptor" },
      });
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
        acceptInvite(
          invite.token,
          f.ownerB.id,
          "someone-else@test.lightline.invalid",
        ),
      ).rejects.toThrow(InviteError);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────
// M2: companies, contacts, deals, custom fields, saved views.
// BUILD_SPEC §5/§8: every new service gets a happy path, a
// validation-failure path, and a cross-tenant-denial path.
// ─────────────────────────────────────────────────────────────────────────

describe("custom field def service", () => {
  it.skipIf(!dbAvailable)(
    "createCustomFieldDef + listCustomFieldDefs round-trip (happy path)",
    async () => {
      const f = fixture!;
      const def = await createCustomFieldDef(f.workspaceA.id, {
        entity: "company",
        key: `referral_source_${Date.now()}`,
        label: "Referral source",
        type: "TEXT",
      });
      const defs = await listCustomFieldDefs(f.workspaceA.id, "company");
      expect(defs.map((d) => d.id)).toContain(def.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "rejects a SELECT field with no options (validation failure)",
    async () => {
      const f = fixture!;
      await expect(
        createCustomFieldDef(f.workspaceA.id, {
          entity: "deal",
          key: `no_options_${Date.now()}`,
          label: "No options",
          type: "SELECT",
        }),
      ).rejects.toThrow(CustomFieldDefError);
    },
  );

  it.skipIf(!dbAvailable)(
    "rejects a duplicate (workspaceId, entity, key) (validation failure)",
    async () => {
      const f = fixture!;
      const key = `dup_key_${Date.now()}`;
      await createCustomFieldDef(f.workspaceA.id, {
        entity: "contact",
        key,
        label: "First",
        type: "TEXT",
      });
      await expect(
        createCustomFieldDef(f.workspaceA.id, {
          entity: "contact",
          key,
          label: "Second",
          type: "TEXT",
        }),
      ).rejects.toThrow(CustomFieldDefError);
    },
  );

  it.skipIf(!dbAvailable)(
    "a field defined in workspace A never appears in workspace B's list, and B cannot delete it (cross-tenant denial)",
    async () => {
      const f = fixture!;
      const def = await createCustomFieldDef(f.workspaceA.id, {
        entity: "company",
        key: `cross_tenant_${Date.now()}`,
        label: "Cross tenant field",
        type: "TEXT",
      });

      const defsB = await listCustomFieldDefs(f.workspaceB.id, "company");
      expect(defsB.map((d) => d.id)).not.toContain(def.id);

      await deleteCustomFieldDef(f.workspaceB.id, def.id);
      const stillThere = await listCustomFieldDefs(f.workspaceA.id, "company");
      expect(stillThere.map((d) => d.id)).toContain(def.id);
    },
  );
});

describe("company service", () => {
  it.skipIf(!dbAvailable)(
    "createCompany + getCompany + listCompanies round-trip (happy path)",
    async () => {
      const f = fixture!;
      const name = `Acme Corp ${Date.now()}`;
      const company = await createCompany(f.workspaceA.id, { name });

      const fetched = await getCompany(f.workspaceA.id, company.id);
      expect(fetched?.id).toBe(company.id);

      const results = await listCompanies(f.workspaceA.id, { q: name });
      expect(results.items.map((c) => c.id)).toContain(company.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "rejects an unknown customFields key (validation failure)",
    async () => {
      const f = fixture!;
      await expect(
        createCompany(f.workspaceA.id, {
          name: "Bad Custom Field Co",
          customFields: { not_a_real_field: "x" },
        }),
      ).rejects.toThrow(CustomFieldError);
    },
  );

  it.skipIf(!dbAvailable)(
    "rejects an ownerId that isn't a membership in this workspace (validation failure)",
    async () => {
      const f = fixture!;
      await expect(
        createCompany(f.workspaceA.id, {
          name: "Bad Owner Co",
          ownerId: "not-a-real-membership-id",
        }),
      ).rejects.toThrow(CompanyError);
    },
  );

  it.skipIf(!dbAvailable)(
    "getCompany/updateCompany/softDeleteCompany all deny a foreign workspaceId (cross-tenant denial)",
    async () => {
      const f = fixture!;
      const company = await createCompany(f.workspaceA.id, {
        name: `Tenant Guard Co ${Date.now()}`,
      });

      expect(await getCompany(f.workspaceB.id, company.id)).toBeNull();
      await expect(
        updateCompany(f.workspaceB.id, company.id, { name: "hijacked" }),
      ).rejects.toThrow(CompanyError);

      await softDeleteCompany(f.workspaceB.id, company.id);
      const stillActive = await getCompany(f.workspaceA.id, company.id);
      expect(stillActive?.deletedAt).toBeNull();
    },
  );

  it.skipIf(!dbAvailable)(
    "soft delete then restore round-trips deletedAt",
    async () => {
      const f = fixture!;
      const company = await createCompany(f.workspaceA.id, {
        name: `Restore Co ${Date.now()}`,
      });

      await softDeleteCompany(f.workspaceA.id, company.id);
      expect(
        (await getCompany(f.workspaceA.id, company.id))?.deletedAt,
      ).not.toBeNull();

      await restoreCompany(f.workspaceA.id, company.id);
      expect(
        (await getCompany(f.workspaceA.id, company.id))?.deletedAt,
      ).toBeNull();
    },
  );
});

describe("contact service", () => {
  it.skipIf(!dbAvailable)(
    "createContact + getContact round-trip (happy path)",
    async () => {
      const f = fixture!;
      const contact = await createContact(f.workspaceA.id, {
        firstName: "Jane",
        lastName: "Doe",
      });
      const fetched = await getContact(f.workspaceA.id, contact.id);
      expect(fetched?.id).toBe(contact.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "rejects a companyId that belongs to a different workspace (validation failure)",
    async () => {
      const f = fixture!;
      const companyInB = await createCompany(f.workspaceB.id, {
        name: `B Co ${Date.now()}`,
      });
      await expect(
        createContact(f.workspaceA.id, {
          firstName: "Cross",
          companyId: companyInB.id,
        }),
      ).rejects.toThrow(ContactError);
    },
  );

  it.skipIf(!dbAvailable)(
    "getContact/updateContact/softDeleteContact all deny a foreign workspaceId (cross-tenant denial)",
    async () => {
      const f = fixture!;
      const contact = await createContact(f.workspaceA.id, {
        firstName: "Guarded",
      });

      expect(await getContact(f.workspaceB.id, contact.id)).toBeNull();
      await expect(
        updateContact(f.workspaceB.id, contact.id, { firstName: "hijacked" }),
      ).rejects.toThrow(ContactError);

      await softDeleteContact(f.workspaceB.id, contact.id);
      const stillActive = await getContact(f.workspaceA.id, contact.id);
      expect(stillActive?.deletedAt).toBeNull();
    },
  );
});

describe("deal service", () => {
  it.skipIf(!dbAvailable)(
    "createDeal derives pipelineId from the given stage, and getDeal round-trips (happy path)",
    async () => {
      const f = fixture!;
      const [stageA] = await listDefaultPipelineStages(f.workspaceA.id);
      expect(stageA).toBeDefined();

      const deal = await createDeal(f.workspaceA.id, {
        title: `123 Main St ${Date.now()}`,
        stageId: stageA!.id,
      });
      expect(deal.pipelineId).toBe(stageA!.pipelineId);

      const fetched = await getDeal(f.workspaceA.id, deal.id);
      expect(fetched?.stage.id).toBe(stageA!.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "rejects a stageId belonging to a different workspace (validation failure)",
    async () => {
      const f = fixture!;
      const [stageA] = await listDefaultPipelineStages(f.workspaceA.id);
      await expect(
        createDeal(f.workspaceB.id, {
          title: "Cross-tenant stage",
          stageId: stageA!.id,
        }),
      ).rejects.toThrow(DealError);
    },
  );

  it.skipIf(!dbAvailable)(
    "rejects a `side` value for a workspace with no deal_side options configured (validation failure — proves the vertical seam)",
    async () => {
      const f = fixture!;
      const [stageB] = await listDefaultPipelineStages(f.workspaceB.id);
      // workspaceB is the general_b2b fixture — DECISIONS §8.6 / tenancy
      // fixture doc comment: it seeds zero deal_side options on purpose.
      await expect(
        createDeal(f.workspaceB.id, {
          title: "No sides here",
          stageId: stageB!.id,
          side: "LISTING",
        }),
      ).rejects.toThrow(DealError);
    },
  );

  it.skipIf(!dbAvailable)(
    "getDeal/updateDeal/softDeleteDeal all deny a foreign workspaceId (cross-tenant denial)",
    async () => {
      const f = fixture!;
      const [stageA] = await listDefaultPipelineStages(f.workspaceA.id);
      const deal = await createDeal(f.workspaceA.id, {
        title: `Guarded Deal ${Date.now()}`,
        stageId: stageA!.id,
      });

      expect(await getDeal(f.workspaceB.id, deal.id)).toBeNull();
      await expect(
        updateDeal(f.workspaceB.id, deal.id, { title: "hijacked" }),
      ).rejects.toThrow(DealError);

      await softDeleteDeal(f.workspaceB.id, deal.id);
      const stillActive = await getDeal(f.workspaceA.id, deal.id);
      expect(stillActive?.deletedAt).toBeNull();
    },
  );

  it.skipIf(!dbAvailable)(
    "soft delete then restore round-trips deletedAt",
    async () => {
      const f = fixture!;
      const [stageA] = await listDefaultPipelineStages(f.workspaceA.id);
      const deal = await createDeal(f.workspaceA.id, {
        title: `Restore Deal ${Date.now()}`,
        stageId: stageA!.id,
      });

      await softDeleteDeal(f.workspaceA.id, deal.id);
      expect(
        (await getDeal(f.workspaceA.id, deal.id))?.deletedAt,
      ).not.toBeNull();

      await restoreDeal(f.workspaceA.id, deal.id);
      expect((await getDeal(f.workspaceA.id, deal.id))?.deletedAt).toBeNull();
    },
  );
});

describe("saved view service", () => {
  it.skipIf(!dbAvailable)(
    "createSavedView + listSavedViews round-trip (happy path)",
    async () => {
      const f = fixture!;
      const ownerMembership = await db.membership.findFirstOrThrow({
        where: { workspaceId: f.workspaceA.id, userId: f.ownerA.id },
      });
      const view = await createSavedView(f.workspaceA.id, ownerMembership.id, {
        entity: "company",
        name: `Big accounts ${Date.now()}`,
        filters: { q: "acme" },
      });

      const views = await listSavedViews(f.workspaceA.id, "company");
      expect(views.map((v) => v.id)).toContain(view.id);
    },
  );

  it.skipIf(!dbAvailable)(
    "a view saved in workspace A never appears in workspace B's list, and B cannot delete it (cross-tenant denial)",
    async () => {
      const f = fixture!;
      const ownerMembership = await db.membership.findFirstOrThrow({
        where: { workspaceId: f.workspaceA.id, userId: f.ownerA.id },
      });
      const view = await createSavedView(f.workspaceA.id, ownerMembership.id, {
        entity: "deal",
        name: `Cross tenant view ${Date.now()}`,
      });

      const viewsB = await listSavedViews(f.workspaceB.id, "deal");
      expect(viewsB.map((v) => v.id)).not.toContain(view.id);

      await deleteSavedView(f.workspaceB.id, view.id);
      expect(await getSavedView(f.workspaceA.id, view.id)).not.toBeNull();
    },
  );
});
