/**
 * Contact lifecycle. Mirrors `company.ts` — see its header for the shared
 * rules (§5 scoping, soft delete, custom fields). The one extra piece of
 * referential integrity here is `companyId`: it must name a company in the
 * *same* workspace, or a contact could be linked into another tenant's data
 * by supplying its id directly.
 */
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { parseCustomFieldValues } from "@/lib/custom-fields";
import { listCustomFieldDefs } from "@/server/services/custom-field-def";
import {
  clampPage,
  PAGE_SIZE,
  toPageResult,
  type PageResult,
} from "@/lib/pagination";

import type { Contact, Prisma as PrismaNS } from "@/generated/prisma/client";

export class ContactError extends Error {
  override name = "ContactError";
}

const SORT_FIELDS = [
  "firstName",
  "lastName",
  "createdAt",
  "updatedAt",
] as const;
export type ContactSortField = (typeof SORT_FIELDS)[number];
export function isContactSortField(value: string): value is ContactSortField {
  return (SORT_FIELDS as readonly string[]).includes(value);
}

export interface ListContactsParams {
  q?: string;
  companyId?: string;
  ownerId?: string;
  deleted?: boolean;
  sort?: ContactSortField;
  dir?: "asc" | "desc";
  page?: number;
}

export type ContactWithCompany = Contact & {
  company: { id: string; name: string } | null;
};

export async function listContacts(
  workspaceId: string,
  params: ListContactsParams = {},
): Promise<PageResult<ContactWithCompany>> {
  const page = clampPage(params.page);
  const where: PrismaNS.ContactWhereInput = {
    workspaceId,
    deletedAt: params.deleted ? { not: null } : null,
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.q
      ? {
          OR: [
            { firstName: { contains: params.q, mode: "insensitive" } },
            { lastName: { contains: params.q, mode: "insensitive" } },
            { email: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const sort = params.sort ?? "lastName";
  const dir = params.dir ?? "asc";

  const [items, total] = await Promise.all([
    db.contact.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { company: { select: { id: true, name: true } } },
    }),
    db.contact.count({ where }),
  ]);

  return toPageResult(items, total, page);
}

export async function getContact(
  workspaceId: string,
  id: string,
): Promise<ContactWithCompany | null> {
  return db.contact.findFirst({
    where: { id, workspaceId },
    include: { company: { select: { id: true, name: true } } },
  });
}

export interface ContactInput {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  linkedinUrl?: string | null;
  companyId?: string | null;
  ownerId?: string | null;
  customFields?: Record<string, unknown>;
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
    throw new ContactError("That company is not in this workspace.");
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
    throw new ContactError("That owner is not a member of this workspace.");
  }
}

async function resolveCustomFields(
  workspaceId: string,
  raw: Record<string, unknown> | undefined,
) {
  if (raw === undefined) return undefined;
  const defs = await listCustomFieldDefs(workspaceId, "contact");
  return parseCustomFieldValues(defs, raw);
}

export async function createContact(
  workspaceId: string,
  input: ContactInput,
): Promise<Contact> {
  await assertCompanyBelongsToWorkspace(workspaceId, input.companyId);
  await assertOwnerBelongsToWorkspace(workspaceId, input.ownerId);
  const customFields = await resolveCustomFields(
    workspaceId,
    input.customFields,
  );

  return db.contact.create({
    data: {
      workspaceId,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      jobTitle: input.jobTitle ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      companyId: input.companyId ?? null,
      ownerId: input.ownerId ?? null,
      customFields: customFields ?? Prisma.JsonNull,
    },
  });
}

export async function updateContact(
  workspaceId: string,
  id: string,
  input: Partial<ContactInput>,
): Promise<Contact> {
  const existing = await db.contact.findFirst({ where: { id, workspaceId } });
  if (!existing) {
    throw new ContactError("Contact not found.");
  }
  if (input.companyId !== undefined) {
    await assertCompanyBelongsToWorkspace(workspaceId, input.companyId);
  }
  if (input.ownerId !== undefined) {
    await assertOwnerBelongsToWorkspace(workspaceId, input.ownerId);
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

  // See the equivalent comment in company.ts's updateCompany: built
  // imperatively against Prisma's own update-input type rather than as a
  // conditional-spread object literal.
  const data: PrismaNS.ContactUpdateInput = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
  if (input.linkedinUrl !== undefined) data.linkedinUrl = input.linkedinUrl;
  if (input.companyId !== undefined) {
    data.company = input.companyId
      ? { connect: { id: input.companyId } }
      : { disconnect: true };
  }
  if (input.ownerId !== undefined) data.ownerId = input.ownerId;
  if (customFields !== undefined) data.customFields = customFields;

  return db.contact.update({ where: { id: existing.id }, data });
}

export async function softDeleteContact(
  workspaceId: string,
  id: string,
): Promise<void> {
  await db.contact.updateMany({
    where: { id, workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

export async function restoreContact(
  workspaceId: string,
  id: string,
): Promise<void> {
  await db.contact.updateMany({
    where: { id, workspaceId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
}

/** Every active contact as a `{ id, firstName, lastName }` tuple,
 * unpaginated — feeds the Deal form's contact picker, same reasoning as
 * `listCompanyOptions` in `company.ts`. */
export async function listContactOptions(
  workspaceId: string,
): Promise<{ id: string; firstName: string; lastName: string | null }[]> {
  return db.contact.findMany({
    where: { workspaceId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 1000,
  });
}

/** Every deal this contact has ever held a role on — the query DECISIONS
 * §8.6 calls out as the reason `DealContact` is indexed
 * `[contactId, role]`: "every deal this person was the seller on" runs from
 * the contact side. Powers the Deals tab on the contact detail page. */
export async function listDealsForContact(
  workspaceId: string,
  contactId: string,
) {
  return db.dealContact.findMany({
    where: { contactId, deal: { workspaceId } },
    include: { deal: true },
    orderBy: { deal: { createdAt: "desc" } },
  });
}
