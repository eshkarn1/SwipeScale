"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { minorUnitsToDecimalString } from "@/lib/money";
import { CustomFieldError } from "@/lib/custom-fields";
import { optionalTrimmedString } from "@/lib/zod-helpers";
import { serializeDeal, type SerializedDeal } from "@/lib/serialize";
import {
  DealError,
  createDeal,
  softDeleteDeal,
  restoreDeal,
  updateDeal,
} from "@/server/services/deal";
import { requireWorkspace } from "@/server/tenancy";

const dealContactSchema = z.object({
  contactId: z.string().trim().min(1),
  role: optionalTrimmedString(60),
  isPrimary: z.boolean().optional(),
});

const dealInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  stageId: z.string().trim().min(1, "Stage is required."),
  companyId: optionalTrimmedString(60),
  ownerId: optionalTrimmedString(60),
  side: optionalTrimmedString(60),
  amountCents: z.number().int().min(0).optional().nullable(),
  currency: z.string().trim().length(3).optional(),
  expectedCloseDate: optionalTrimmedString(40),
  source: optionalTrimmedString(120),
  customFields: z.record(z.string(), z.unknown()).optional(),
  contacts: z.array(dealContactSchema).max(20).optional(),
});

type DealInputSchema = z.infer<typeof dealInputSchema>;
type PartialDealInputSchema = z.infer<
  ReturnType<typeof dealInputSchema.partial>
>;

function toCreateServiceInput(parsed: DealInputSchema) {
  return {
    title: parsed.title,
    stageId: parsed.stageId,
    companyId: parsed.companyId,
    ownerId: parsed.ownerId,
    side: parsed.side,
    amount:
      parsed.amountCents !== undefined && parsed.amountCents !== null
        ? minorUnitsToDecimalString(parsed.amountCents)
        : null,
    currency: parsed.currency,
    expectedCloseDate: parsed.expectedCloseDate,
    source: parsed.source,
    customFields: parsed.customFields,
    contacts: parsed.contacts,
  };
}

function toUpdateServiceInput(parsed: PartialDealInputSchema) {
  return {
    ...(parsed.title !== undefined ? { title: parsed.title } : {}),
    ...(parsed.stageId !== undefined ? { stageId: parsed.stageId } : {}),
    ...(parsed.companyId !== undefined ? { companyId: parsed.companyId } : {}),
    ...(parsed.ownerId !== undefined ? { ownerId: parsed.ownerId } : {}),
    ...(parsed.side !== undefined ? { side: parsed.side } : {}),
    ...(parsed.amountCents !== undefined
      ? {
          amount:
            parsed.amountCents !== null
              ? minorUnitsToDecimalString(parsed.amountCents)
              : "0",
        }
      : {}),
    ...(parsed.currency !== undefined ? { currency: parsed.currency } : {}),
    ...(parsed.expectedCloseDate !== undefined
      ? { expectedCloseDate: parsed.expectedCloseDate }
      : {}),
    ...(parsed.source !== undefined ? { source: parsed.source } : {}),
    ...(parsed.customFields !== undefined
      ? { customFields: parsed.customFields }
      : {}),
    ...(parsed.contacts !== undefined ? { contacts: parsed.contacts } : {}),
  };
}

export async function createDealAction(
  workspaceSlug: string,
  input: unknown,
): Promise<ActionResult<SerializedDeal>> {
  const { workspace, membership } = await requireWorkspace(
    workspaceSlug,
    "MEMBER",
  );

  const parsed = dealInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const deal = await createDeal(
      workspace.id,
      toCreateServiceInput(parsed.data),
      {
        changedById: membership.id,
      },
    );
    revalidatePath(`/${workspaceSlug}/deals`);
    // `amount` is a Prisma `Decimal` — see src/lib/serialize.ts.
    return { ok: true, data: serializeDeal(deal) };
  } catch (error) {
    if (error instanceof DealError || error instanceof CustomFieldError) {
      return { ok: false, error: error.message };
    }
    console.error("[deal] create failed:", error);
    return { ok: false, error: "Couldn't create the deal. Try again." };
  }
}

export async function updateDealAction(
  workspaceSlug: string,
  dealId: string,
  input: unknown,
): Promise<ActionResult<SerializedDeal>> {
  const { workspace, membership } = await requireWorkspace(
    workspaceSlug,
    "MEMBER",
  );

  const parsed = dealInputSchema.partial().safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const deal = await updateDeal(
      workspace.id,
      dealId,
      toUpdateServiceInput(parsed.data),
      {
        changedById: membership.id,
      },
    );
    revalidatePath(`/${workspaceSlug}/deals`);
    revalidatePath(`/${workspaceSlug}/deals/${dealId}`);
    return { ok: true, data: serializeDeal(deal) };
  } catch (error) {
    if (error instanceof DealError || error instanceof CustomFieldError) {
      return { ok: false, error: error.message };
    }
    console.error("[deal] update failed:", error);
    return { ok: false, error: "Couldn't update the deal. Try again." };
  }
}

export async function softDeleteDealAction(
  workspaceSlug: string,
  dealId: string,
): Promise<ActionResult<null>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");
  await softDeleteDeal(workspace.id, dealId);
  revalidatePath(`/${workspaceSlug}/deals`);
  return { ok: true, data: null };
}

export async function restoreDealAction(
  workspaceSlug: string,
  dealId: string,
): Promise<ActionResult<null>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");
  await restoreDeal(workspace.id, dealId);
  revalidatePath(`/${workspaceSlug}/deals`);
  return { ok: true, data: null };
}
