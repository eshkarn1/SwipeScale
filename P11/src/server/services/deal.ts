/**
 * Deal lifecycle. The most involved of the three M2 record services because
 * a Deal carries three extra pieces of referential integrity beyond
 * `company.ts` / `contact.ts`:
 *
 * - `stageId` must name a `Stage` in this workspace, and `pipelineId` is
 *   *derived* from that stage rather than accepted separately — a stage
 *   only ever belongs to one pipeline, and taking both independently would
 *   let a client mismatch them.
 * - `side` (DECISIONS §8.6) validates against the workspace's `deal_side`
 *   `WorkspaceOption`s when set, and stays `null` for a workspace (like the
 *   seeded `general_b2b` one) with no concept of sides at all.
 * - The deal's contacts (`DealContact`) — each with an optional `role`
 *   validated the same way against `deal_contact_role` — are replaced as a
 *   whole on every write rather than diffed, matching how the edit form
 *   manages the list client-side.
 *
 * A stage change writes an (append-only) `DealStageEvent`, same shape
 * `prisma/seed.ts` already writes on creation — kept here so the pipeline
 * reporting BUILD_SPEC defers to M3/M5 has real history to read once it
 * exists, not just from the seed data.
 */
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { parseCustomFieldValues } from "@/lib/custom-fields";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import { isValidWorkspaceOption } from "@/server/queries/workspace-options";
import {
  clampPage,
  PAGE_SIZE,
  toPageResult,
  type PageResult,
} from "@/lib/pagination";

import type { Deal, Prisma as PrismaNS } from "@/generated/prisma/client";

export class DealError extends Error {
  override name = "DealError";
}

const SORT_FIELDS = [
  "title",
  "amount",
  "createdAt",
  "updatedAt",
  "expectedCloseDate",
] as const;
export type DealSortField = (typeof SORT_FIELDS)[number];
export function isDealSortField(value: string): value is DealSortField {
  return (SORT_FIELDS as readonly string[]).includes(value);
}

export type DealWithRelations = Deal & {
  stage: { id: string; name: string; type: string; color: string };
  company: { id: string; name: string } | null;
  contacts: {
    contactId: string;
    role: string | null;
    isPrimary: boolean;
    contact: { id: string; firstName: string; lastName: string | null };
  }[];
};

export interface ListDealsParams {
  q?: string;
  stageId?: string;
  side?: string;
  companyId?: string;
  ownerId?: string;
  deleted?: boolean;
  sort?: DealSortField;
  dir?: "asc" | "desc";
  page?: number;
}

export async function listDeals(
  workspaceId: string,
  params: ListDealsParams = {},
): Promise<PageResult<DealWithRelations>> {
  const page = clampPage(params.page);
  const where: PrismaNS.DealWhereInput = {
    workspaceId,
    deletedAt: params.deleted ? { not: null } : null,
    ...(params.stageId ? { stageId: params.stageId } : {}),
    ...(params.side ? { side: params.side } : {}),
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.q ? { title: { contains: params.q, mode: "insensitive" } } : {}),
  };

  const sort = params.sort ?? "createdAt";
  const dir = params.dir ?? "desc";

  const include = {
    stage: { select: { id: true, name: true, type: true, color: true } },
    company: { select: { id: true, name: true } },
    contacts: {
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    },
  } satisfies PrismaNS.DealInclude;

  const [items, total] = await Promise.all([
    db.deal.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include,
    }),
    db.deal.count({ where }),
  ]);

  return toPageResult(items as DealWithRelations[], total, page);
}

export async function getDeal(
  workspaceId: string,
  id: string,
): Promise<DealWithRelations | null> {
  return db.deal.findFirst({
    where: { id, workspaceId },
    include: {
      stage: { select: { id: true, name: true, type: true, color: true } },
      company: { select: { id: true, name: true } },
      contacts: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  }) as Promise<DealWithRelations | null>;
}

export interface DealContactInput {
  contactId: string;
  role?: string | null;
  isPrimary?: boolean;
}

export interface DealInput {
  title: string;
  stageId: string;
  companyId?: string | null;
  ownerId?: string | null;
  side?: string | null;
  amount?: string | null; // decimal string, major units
  currency?: string;
  expectedCloseDate?: string | null; // ISO date
  source?: string | null;
  customFields?: Record<string, unknown>;
  contacts?: DealContactInput[];
}

async function resolveStage(workspaceId: string, stageId: string) {
  const stage = await db.stage.findFirst({
    where: { id: stageId, workspaceId },
  });
  if (!stage) {
    throw new DealError("That stage is not in this workspace.");
  }
  return stage;
}

async function assertCompanyBelongsToWorkspace(
  workspaceId: string,
  companyId: string | null | undefined,
) {
  if (!companyId) return;
  const company = await db.company.findFirst({
    where: { id: companyId, workspaceId },
  });
  if (!company) {
    throw new DealError("That company is not in this workspace.");
  }
}

async function assertOwnerBelongsToWorkspace(
  workspaceId: string,
  ownerId: string | null | undefined,
) {
  if (!ownerId) return;
  const membership = await db.membership.findFirst({
    where: { id: ownerId, workspaceId },
  });
  if (!membership) {
    throw new DealError("That owner is not a member of this workspace.");
  }
}

async function assertSideIsValid(
  workspaceId: string,
  side: string | null | undefined,
) {
  if (!side) return;
  const valid = await isValidWorkspaceOption(workspaceId, "deal_side", side);
  if (!valid) {
    throw new DealError(
      "That deal side isn't one of this workspace's options.",
    );
  }
}

async function assertContactsAreValid(
  workspaceId: string,
  contacts: DealContactInput[] | undefined,
) {
  if (!contacts?.length) return;
  const contactIds = contacts.map((c) => c.contactId);
  if (contactIds.length !== new Set(contactIds).size) {
    // Caught here rather than left to the DB: `DealContact`'s primary key is
    // `(dealId, contactId)`, so a duplicate would otherwise surface as a raw
    // Prisma unique-constraint error instead of a message the form can show.
    throw new DealError("A contact can only be added to a deal once.");
  }
  const found = await db.contact.findMany({
    where: { id: { in: contactIds }, workspaceId },
    select: { id: true },
  });
  if (found.length !== new Set(contactIds).size) {
    throw new DealError("One or more contacts are not in this workspace.");
  }
  for (const contact of contacts) {
    if (contact.role) {
      const valid = await isValidWorkspaceOption(
        workspaceId,
        "deal_contact_role",
        contact.role,
      );
      if (!valid) {
        throw new DealError(
          `"${contact.role}" isn't one of this workspace's contact roles.`,
        );
      }
    }
  }
}

async function resolveCustomFields(
  workspaceId: string,
  raw: Record<string, unknown> | undefined,
) {
  if (raw === undefined) return undefined;
  const defs = await listCustomFieldDefs(workspaceId, "deal");
  return parseCustomFieldValues(defs, raw);
}

export interface CreateDealOptions {
  changedById?: string | null;
}

export async function createDeal(
  workspaceId: string,
  input: DealInput,
  options: CreateDealOptions = {},
): Promise<Deal> {
  const stage = await resolveStage(workspaceId, input.stageId);
  await assertCompanyBelongsToWorkspace(workspaceId, input.companyId);
  await assertOwnerBelongsToWorkspace(workspaceId, input.ownerId);
  await assertSideIsValid(workspaceId, input.side);
  await assertContactsAreValid(workspaceId, input.contacts);
  const customFields = await resolveCustomFields(
    workspaceId,
    input.customFields,
  );
  const amount = input.amount ?? "0";

  return db.$transaction(async (tx) => {
    const deal = await tx.deal.create({
      data: {
        workspaceId,
        pipelineId: stage.pipelineId,
        stageId: stage.id,
        title: input.title,
        companyId: input.companyId ?? null,
        ownerId: input.ownerId ?? null,
        side: input.side ?? null,
        amount,
        currency: input.currency ?? "USD",
        expectedCloseDate: input.expectedCloseDate
          ? new Date(input.expectedCloseDate)
          : null,
        source: input.source ?? null,
        customFields: customFields ?? Prisma.JsonNull,
      },
    });

    if (input.contacts?.length) {
      await tx.dealContact.createMany({
        data: input.contacts.map((c) => ({
          dealId: deal.id,
          contactId: c.contactId,
          role: c.role ?? null,
          isPrimary: c.isPrimary ?? false,
        })),
      });
    }

    await tx.dealStageEvent.create({
      data: {
        workspaceId,
        dealId: deal.id,
        fromStageId: null,
        toStageId: stage.id,
        amount,
        changedById: options.changedById ?? null,
      },
    });

    return deal;
  });
}

export interface UpdateDealOptions {
  changedById?: string | null;
}

export async function updateDeal(
  workspaceId: string,
  id: string,
  input: Partial<DealInput>,
  options: UpdateDealOptions = {},
): Promise<Deal> {
  const existing = await db.deal.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    throw new DealError("Deal not found.");
  }

  let nextStage: { id: string; pipelineId: string } | undefined;
  if (input.stageId !== undefined) {
    nextStage = await resolveStage(workspaceId, input.stageId);
  }
  if (input.companyId !== undefined) {
    await assertCompanyBelongsToWorkspace(workspaceId, input.companyId);
  }
  if (input.ownerId !== undefined) {
    await assertOwnerBelongsToWorkspace(workspaceId, input.ownerId);
  }
  if (input.side !== undefined) {
    await assertSideIsValid(workspaceId, input.side);
  }
  if (input.contacts !== undefined) {
    await assertContactsAreValid(workspaceId, input.contacts);
  }

  const customFields: Prisma.InputJsonValue | undefined =
    input.customFields !== undefined
      ? ({
          ...(typeof existing.customFields === "object" &&
          existing.customFields !== null
            ? (existing.customFields as Record<string, unknown>)
            : {}),
          ...(await resolveCustomFields(workspaceId, input.customFields)),
        } as Prisma.InputJsonValue)
      : undefined;

  // Unchecked variant, not Checked: `companyId`/`pipelineId`/`stageId` are
  // relation-backed FKs in schema.prisma, and only the Unchecked update
  // input accepts them as raw scalar ids rather than `{ connect: { id } }`
  // objects — see the equivalent comment in company.ts's updateCompany for
  // why this is built imperatively either way.
  const data: PrismaNS.DealUncheckedUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (nextStage) {
    data.stageId = nextStage.id;
    data.pipelineId = nextStage.pipelineId;
  }
  if (input.companyId !== undefined) data.companyId = input.companyId;
  if (input.ownerId !== undefined) data.ownerId = input.ownerId;
  if (input.side !== undefined) data.side = input.side;
  if (input.amount !== undefined) data.amount = input.amount ?? "0";
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.expectedCloseDate !== undefined) {
    data.expectedCloseDate = input.expectedCloseDate
      ? new Date(input.expectedCloseDate)
      : null;
  }
  if (input.source !== undefined) data.source = input.source;
  if (customFields !== undefined) data.customFields = customFields;

  return db.$transaction(async (tx) => {
    const updated = await tx.deal.update({ where: { id: existing.id }, data });

    if (input.contacts !== undefined) {
      await tx.dealContact.deleteMany({ where: { dealId: existing.id } });
      if (input.contacts.length) {
        await tx.dealContact.createMany({
          data: input.contacts.map((c) => ({
            dealId: existing.id,
            contactId: c.contactId,
            role: c.role ?? null,
            isPrimary: c.isPrimary ?? false,
          })),
        });
      }
    }

    if (nextStage && nextStage.id !== existing.stageId) {
      await tx.dealStageEvent.create({
        data: {
          workspaceId,
          dealId: existing.id,
          fromStageId: existing.stageId,
          toStageId: nextStage.id,
          amount: updated.amount,
          changedById: options.changedById ?? null,
        },
      });
    }

    return updated;
  });
}

export async function softDeleteDeal(
  workspaceId: string,
  id: string,
): Promise<void> {
  await db.deal.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

export async function restoreDeal(
  workspaceId: string,
  id: string,
): Promise<void> {
  await db.deal.updateMany({
    where: { id, workspaceId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
}

/** The workspace's default pipeline's stages, in position order — every M2
 * deal form pins to the default pipeline (kanban/multi-pipeline management
 * is BUILD_SPEC M3, out of scope here). */
export async function listDefaultPipelineStages(workspaceId: string) {
  const pipeline = await db.pipeline.findFirst({
    where: { workspaceId, isDefault: true },
  });
  if (!pipeline) return [];
  return db.stage.findMany({
    where: { workspaceId, pipelineId: pipeline.id },
    orderBy: { position: "asc" },
  });
}
