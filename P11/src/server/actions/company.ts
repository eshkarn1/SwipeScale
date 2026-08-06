"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { minorUnitsToDecimalString } from "@/lib/money";
import { CustomFieldError } from "@/lib/custom-fields";
import { optionalTrimmedString } from "@/lib/zod-helpers";
import { serializeCompany, type SerializedCompany } from "@/lib/serialize";
import {
  CompanyError,
  createCompany,
  softDeleteCompany,
  restoreCompany,
  updateCompany,
} from "@/server/services/company";
import { requireWorkspace } from "@/server/tenancy";

const companyInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  domain: optionalTrimmedString(200),
  industry: optionalTrimmedString(120),
  employees: z.number().int().min(0).max(50_000_000).optional().nullable(),
  annualRevenueCents: z.number().int().min(0).optional().nullable(),
  addressCity: optionalTrimmedString(120),
  addressCountry: optionalTrimmedString(2),
  linkedinUrl: optionalTrimmedString(500),
  ownerId: optionalTrimmedString(60),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

type CompanyInputSchema = z.infer<typeof companyInputSchema>;
type PartialCompanyInputSchema = z.infer<
  ReturnType<typeof companyInputSchema.partial>
>;

/** `annualRevenueCents` is the only field that needs translating on the way
 * in (minor units -> the DB's decimal string, per src/lib/money.ts); every
 * other field passes through as-is. Used for create, where every field is
 * present (possibly `null`). */
function toCreateServiceInput(parsed: CompanyInputSchema) {
  return {
    name: parsed.name,
    domain: parsed.domain,
    industry: parsed.industry,
    employees: parsed.employees ?? null,
    annualRevenue:
      parsed.annualRevenueCents !== undefined &&
      parsed.annualRevenueCents !== null
        ? minorUnitsToDecimalString(parsed.annualRevenueCents)
        : null,
    addressCity: parsed.addressCity,
    addressCountry: parsed.addressCountry,
    linkedinUrl: parsed.linkedinUrl,
    ownerId: parsed.ownerId,
    customFields: parsed.customFields,
  };
}

/** Same translation, but for a partial update: a field genuinely absent
 * from the client's payload must stay `undefined` so `updateCompany`
 * leaves it untouched, never coerced to `null`/`""` and overwritten. */
function toUpdateServiceInput(parsed: PartialCompanyInputSchema) {
  return {
    ...(parsed.name !== undefined ? { name: parsed.name } : {}),
    ...(parsed.domain !== undefined ? { domain: parsed.domain } : {}),
    ...(parsed.industry !== undefined ? { industry: parsed.industry } : {}),
    ...(parsed.employees !== undefined ? { employees: parsed.employees } : {}),
    ...(parsed.annualRevenueCents !== undefined
      ? {
          annualRevenue:
            parsed.annualRevenueCents !== null
              ? minorUnitsToDecimalString(parsed.annualRevenueCents)
              : null,
        }
      : {}),
    ...(parsed.addressCity !== undefined
      ? { addressCity: parsed.addressCity }
      : {}),
    ...(parsed.addressCountry !== undefined
      ? { addressCountry: parsed.addressCountry }
      : {}),
    ...(parsed.linkedinUrl !== undefined
      ? { linkedinUrl: parsed.linkedinUrl }
      : {}),
    ...(parsed.ownerId !== undefined ? { ownerId: parsed.ownerId } : {}),
    ...(parsed.customFields !== undefined
      ? { customFields: parsed.customFields }
      : {}),
  };
}

export async function createCompanyAction(
  workspaceSlug: string,
  input: unknown,
): Promise<ActionResult<SerializedCompany>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");

  const parsed = companyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const company = await createCompany(
      workspace.id,
      toCreateServiceInput(parsed.data),
    );
    revalidatePath(`/${workspaceSlug}/companies`);
    // `annualRevenue` is a Prisma `Decimal` — React's Flight protocol
    // cannot serialize it back to the client (src/lib/serialize.ts).
    return { ok: true, data: serializeCompany(company) };
  } catch (error) {
    if (error instanceof CompanyError || error instanceof CustomFieldError) {
      return { ok: false, error: error.message };
    }
    console.error("[company] create failed:", error);
    return { ok: false, error: "Couldn't create the company. Try again." };
  }
}

export async function updateCompanyAction(
  workspaceSlug: string,
  companyId: string,
  input: unknown,
): Promise<ActionResult<SerializedCompany>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");

  const parsed = companyInputSchema.partial().safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const company = await updateCompany(
      workspace.id,
      companyId,
      toUpdateServiceInput(parsed.data),
    );
    revalidatePath(`/${workspaceSlug}/companies`);
    revalidatePath(`/${workspaceSlug}/companies/${companyId}`);
    return { ok: true, data: serializeCompany(company) };
  } catch (error) {
    if (error instanceof CompanyError || error instanceof CustomFieldError) {
      return { ok: false, error: error.message };
    }
    console.error("[company] update failed:", error);
    return { ok: false, error: "Couldn't update the company. Try again." };
  }
}

export async function softDeleteCompanyAction(
  workspaceSlug: string,
  companyId: string,
): Promise<ActionResult<null>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");
  await softDeleteCompany(workspace.id, companyId);
  revalidatePath(`/${workspaceSlug}/companies`);
  return { ok: true, data: null };
}

export async function restoreCompanyAction(
  workspaceSlug: string,
  companyId: string,
): Promise<ActionResult<null>> {
  const { workspace } = await requireWorkspace(workspaceSlug, "MEMBER");
  await restoreCompany(workspace.id, companyId);
  revalidatePath(`/${workspaceSlug}/companies`);
  return { ok: true, data: null };
}
