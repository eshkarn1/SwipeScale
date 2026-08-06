"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { CustomFieldError } from "@/lib/custom-fields";
import { optionalTrimmedString } from "@/lib/zod-helpers";
import {
  ContactError,
  createContact,
  softDeleteContact,
  restoreContact,
  updateContact,
} from "@/server/services/contact";
import { requireWorkspace } from "@/server/tenancy";

import type { Contact } from "@/generated/prisma/client";

const contactInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(120),
  lastName: optionalTrimmedString(120),
  email: optionalTrimmedString(200),
  phone: optionalTrimmedString(40),
  jobTitle: optionalTrimmedString(120),
  linkedinUrl: optionalTrimmedString(500),
  companyId: optionalTrimmedString(60),
  ownerId: optionalTrimmedString(60),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

type ContactInputSchema = z.infer<typeof contactInputSchema>;
type PartialContactInputSchema = z.infer<
  ReturnType<typeof contactInputSchema.partial>
>;

function toCreateServiceInput(parsed: ContactInputSchema) {
  return parsed;
}

function toUpdateServiceInput(parsed: PartialContactInputSchema) {
  return {
    ...(parsed.firstName !== undefined ? { firstName: parsed.firstName } : {}),
    ...(parsed.lastName !== undefined ? { lastName: parsed.lastName } : {}),
    ...(parsed.email !== undefined ? { email: parsed.email } : {}),
    ...(parsed.phone !== undefined ? { phone: parsed.phone } : {}),
    ...(parsed.jobTitle !== undefined ? { jobTitle: parsed.jobTitle } : {}),
    ...(parsed.linkedinUrl !== undefined
      ? { linkedinUrl: parsed.linkedinUrl }
      : {}),
    ...(parsed.companyId !== undefined ? { companyId: parsed.companyId } : {}),
    ...(parsed.ownerId !== undefined ? { ownerId: parsed.ownerId } : {}),
    ...(parsed.customFields !== undefined
      ? { customFields: parsed.customFields }
      : {}),
  };
}

export async function createContactAction(
  workspaceSlug: string,
  input: unknown,
): Promise<ActionResult<Contact>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");

  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const contact = await createContact(
      workspace.id,
      toCreateServiceInput(parsed.data),
    );
    revalidatePath(`/${workspaceSlug}/contacts`);
    return { ok: true, data: contact };
  } catch (error) {
    if (error instanceof ContactError || error instanceof CustomFieldError) {
      return { ok: false, error: error.message };
    }
    console.error("[contact] create failed:", error);
    return { ok: false, error: "Couldn't create the contact. Try again." };
  }
}

export async function updateContactAction(
  workspaceSlug: string,
  contactId: string,
  input: unknown,
): Promise<ActionResult<Contact>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");

  const parsed = contactInputSchema.partial().safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const contact = await updateContact(
      workspace.id,
      contactId,
      toUpdateServiceInput(parsed.data),
    );
    revalidatePath(`/${workspaceSlug}/contacts`);
    revalidatePath(`/${workspaceSlug}/contacts/${contactId}`);
    return { ok: true, data: contact };
  } catch (error) {
    if (error instanceof ContactError || error instanceof CustomFieldError) {
      return { ok: false, error: error.message };
    }
    console.error("[contact] update failed:", error);
    return { ok: false, error: "Couldn't update the contact. Try again." };
  }
}

export async function softDeleteContactAction(
  workspaceSlug: string,
  contactId: string,
): Promise<ActionResult<null>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");
  await softDeleteContact(workspace.id, contactId);
  revalidatePath(`/${workspaceSlug}/contacts`);
  return { ok: true, data: null };
}

export async function restoreContactAction(
  workspaceSlug: string,
  contactId: string,
): Promise<ActionResult<null>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");
  await restoreContact(workspace.id, contactId);
  revalidatePath(`/${workspaceSlug}/contacts`);
  return { ok: true, data: null };
}
