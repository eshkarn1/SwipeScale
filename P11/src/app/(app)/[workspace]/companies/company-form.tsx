"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CustomFieldsFields } from "@/components/app/custom-fields-fields";
import {
  createCompanyAction,
  updateCompanyAction,
} from "@/server/actions/company";
import { toast } from "@/components/ui/toast";

import type { CustomFieldDef } from "@/generated/prisma/client";
import type { SerializedCompany } from "@/lib/serialize";

export interface OwnerOption {
  id: string;
  label: string;
}

/** Sentinel for the Select's "no owner" item — Radix `Select.Item` rejects
 * an empty-string `value`, so `ownerId === ""` (unassigned, per the service
 * layer) is represented by this string only inside the widget. */
const UNASSIGNED = "__unassigned__";

/** Create/edit Sheet for a Company. One component for both modes — passing
 * `company` switches it to edit — so the field list and custom-field
 * rendering can never drift between the two flows. Only rendered while
 * `open`, so every field's local state is freshly seeded from `company`
 * (or blank) on every open rather than needing a manual reset effect. */
export function CompanyFormSheet({
  workspaceSlug,
  open,
  onOpenChange,
  owners,
  customFieldDefs,
  company,
  onSaved,
}: {
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owners: OwnerOption[];
  customFieldDefs: CustomFieldDef[];
  company?: SerializedCompany;
  onSaved?: (company: SerializedCompany) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SheetContent>
          <CompanyFormBody
            workspaceSlug={workspaceSlug}
            owners={owners}
            customFieldDefs={customFieldDefs}
            company={company}
            onSaved={(c) => {
              onOpenChange(false);
              onSaved?.(c);
            }}
          />
        </SheetContent>
      ) : null}
    </Sheet>
  );
}

function toCustomFieldRecord(customFields: unknown): Record<string, unknown> {
  return typeof customFields === "object" && customFields !== null
    ? (customFields as Record<string, unknown>)
    : {};
}

function CompanyFormBody({
  workspaceSlug,
  owners,
  customFieldDefs,
  company,
  onSaved,
}: {
  workspaceSlug: string;
  owners: OwnerOption[];
  customFieldDefs: CustomFieldDef[];
  company?: SerializedCompany;
  onSaved: (company: SerializedCompany) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(company);

  const [name, setName] = useState(company?.name ?? "");
  const [domain, setDomain] = useState(company?.domain ?? "");
  const [industry, setIndustry] = useState(company?.industry ?? "");
  const [employees, setEmployees] = useState(
    company?.employees?.toString() ?? "",
  );
  const [annualRevenue, setAnnualRevenue] = useState(
    company?.annualRevenue ? company.annualRevenue.toString() : "",
  );
  const [addressCity, setAddressCity] = useState(company?.addressCity ?? "");
  const [addressCountry, setAddressCountry] = useState(
    company?.addressCountry ?? "",
  );
  const [linkedinUrl, setLinkedinUrl] = useState(company?.linkedinUrl ?? "");
  const [ownerId, setOwnerId] = useState(company?.ownerId ?? "");
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, unknown>
  >(toCustomFieldRecord(company?.customFields));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input = {
      name,
      domain: domain || null,
      industry: industry || null,
      employees: employees ? Number(employees) : null,
      annualRevenueCents: annualRevenue
        ? Math.round(Number(annualRevenue) * 100)
        : null,
      addressCity: addressCity || null,
      addressCountry: addressCountry || null,
      linkedinUrl: linkedinUrl || null,
      ownerId: ownerId || null,
      customFields: customFieldValues,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateCompanyAction(workspaceSlug, company!.id, input)
        : await createCompanyAction(workspaceSlug, input);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(isEdit ? "Company updated." : "Company created.");
      router.refresh();
      onSaved(result.data);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col gap-4 overflow-y-auto"
      noValidate
    >
      <SheetHeader>
        <SheetTitle>{isEdit ? "Edit company" : "New company"}</SheetTitle>
      </SheetHeader>

      <Field label="Name" error={error ?? undefined}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={Boolean(error)}
            required
            autoFocus
          />
        )}
      </Field>

      <Field label="Domain">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            placeholder="acme.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        )}
      </Field>

      <Field label="Industry">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Employees">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              min={0}
              value={employees}
              onChange={(e) => setEmployees(e.target.value)}
            />
          )}
        </Field>
        <Field label="Annual revenue" description="Dollars">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              min={0}
              step="0.01"
              value={annualRevenue}
              onChange={(e) => setAnnualRevenue(e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
            />
          )}
        </Field>
        <Field label="Country">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              placeholder="US"
              value={addressCountry}
              onChange={(e) => setAddressCountry(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="LinkedIn URL">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-col gap-1.5">
        <Label>Owner</Label>
        <Select
          value={ownerId || UNASSIGNED}
          onValueChange={(v) => setOwnerId(v === UNASSIGNED ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {customFieldDefs.length > 0 ? (
        <>
          <hr className="border-border" />
          <CustomFieldsFields
            defs={customFieldDefs}
            values={customFieldValues}
            onChange={(key, value) =>
              setCustomFieldValues((prev) => ({ ...prev, [key]: value }))
            }
          />
        </>
      ) : null}

      <SheetFooter>
        <Button type="submit" loading={isPending}>
          {isEdit ? "Save changes" : "Create company"}
        </Button>
      </SheetFooter>
    </form>
  );
}
