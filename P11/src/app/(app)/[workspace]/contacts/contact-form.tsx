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
import { toast } from "@/components/ui/toast";
import {
  createContactAction,
  updateContactAction,
} from "@/server/actions/contact";

import type { Contact, CustomFieldDef } from "@/generated/prisma/client";

export interface OwnerOption {
  id: string;
  label: string;
}
export interface CompanyOption {
  id: string;
  name: string;
}

const UNASSIGNED = "__unassigned__";

/** Create/edit Sheet for a Contact. Mirrors `company-form.tsx` — one
 * component for both modes, only rendered while open so field state is
 * always freshly seeded. */
export function ContactFormSheet({
  workspaceSlug,
  open,
  onOpenChange,
  owners,
  companies,
  customFieldDefs,
  contact,
  defaultCompanyId,
  onSaved,
}: {
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owners: OwnerOption[];
  companies: CompanyOption[];
  customFieldDefs: CustomFieldDef[];
  contact?: Contact;
  defaultCompanyId?: string;
  onSaved?: (contact: Contact) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SheetContent>
          <ContactFormBody
            workspaceSlug={workspaceSlug}
            owners={owners}
            companies={companies}
            customFieldDefs={customFieldDefs}
            contact={contact}
            defaultCompanyId={defaultCompanyId}
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

function ContactFormBody({
  workspaceSlug,
  owners,
  companies,
  customFieldDefs,
  contact,
  defaultCompanyId,
  onSaved,
}: {
  workspaceSlug: string;
  owners: OwnerOption[];
  companies: CompanyOption[];
  customFieldDefs: CustomFieldDef[];
  contact?: Contact;
  defaultCompanyId?: string;
  onSaved: (contact: Contact) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(contact);

  const [firstName, setFirstName] = useState(contact?.firstName ?? "");
  const [lastName, setLastName] = useState(contact?.lastName ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(contact?.jobTitle ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedinUrl ?? "");
  const [companyId, setCompanyId] = useState(
    contact?.companyId ?? defaultCompanyId ?? "",
  );
  const [ownerId, setOwnerId] = useState(contact?.ownerId ?? "");
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, unknown>
  >(toCustomFieldRecord(contact?.customFields));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input = {
      firstName,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      jobTitle: jobTitle || null,
      linkedinUrl: linkedinUrl || null,
      companyId: companyId || null,
      ownerId: ownerId || null,
      customFields: customFieldValues,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateContactAction(workspaceSlug, contact!.id, input)
        : await createContactAction(workspaceSlug, input);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(isEdit ? "Contact updated." : "Contact created.");
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
        <SheetTitle>{isEdit ? "Edit contact" : "New contact"}</SheetTitle>
      </SheetHeader>

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" error={error ?? undefined}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              invalid={Boolean(error)}
              required
              autoFocus
            />
          )}
        </Field>
        <Field label="Last name">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Email">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
        </Field>
        <Field label="Job title">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
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
        <Label>Company</Label>
        <Select
          value={companyId || UNASSIGNED}
          onValueChange={(v) => setCompanyId(v === UNASSIGNED ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>None</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          {isEdit ? "Save changes" : "Create contact"}
        </Button>
      </SheetFooter>
    </form>
  );
}
