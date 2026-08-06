"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

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
import { createDealAction, updateDealAction } from "@/server/actions/deal";

import type { CustomFieldDef, Stage } from "@/generated/prisma/client";
import type { SerializedDealWithRelations } from "@/lib/serialize";

export interface OwnerOption {
  id: string;
  label: string;
}
export interface CompanyOption {
  id: string;
  name: string;
}
export interface ContactOption {
  id: string;
  label: string;
}
export interface WorkspaceOptionChoice {
  value: string;
  label: string;
}

const UNASSIGNED = "__unassigned__";

interface DealContactRow {
  contactId: string;
  role: string;
  isPrimary: boolean;
}

/** Create/edit Sheet for a Deal. The one M2 form with real referential
 * structure beyond a flat field list: `stages` pins the workspace's default
 * pipeline (multi-pipeline management is M3), `sides` is empty and hidden
 * entirely for a workspace with no `deal_side` vocabulary (DECISIONS §8.6),
 * and `contacts` is a small repeating group rather than a single field. */
export function DealFormSheet({
  workspaceSlug,
  open,
  onOpenChange,
  stages,
  owners,
  companies,
  contactOptions,
  sides,
  contactRoles,
  customFieldDefs,
  deal,
  defaultCompanyId,
  onSaved,
}: {
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  owners: OwnerOption[];
  companies: CompanyOption[];
  contactOptions: ContactOption[];
  sides: WorkspaceOptionChoice[];
  contactRoles: WorkspaceOptionChoice[];
  customFieldDefs: CustomFieldDef[];
  deal?: SerializedDealWithRelations;
  defaultCompanyId?: string;
  onSaved?: (deal: SerializedDealWithRelations) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <SheetContent className="sm:max-w-lg">
          <DealFormBody
            workspaceSlug={workspaceSlug}
            stages={stages}
            owners={owners}
            companies={companies}
            contactOptions={contactOptions}
            sides={sides}
            contactRoles={contactRoles}
            customFieldDefs={customFieldDefs}
            deal={deal}
            defaultCompanyId={defaultCompanyId}
            onSaved={(d) => {
              onOpenChange(false);
              onSaved?.(d);
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

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function DealFormBody({
  workspaceSlug,
  stages,
  owners,
  companies,
  contactOptions,
  sides,
  contactRoles,
  customFieldDefs,
  deal,
  defaultCompanyId,
  onSaved,
}: {
  workspaceSlug: string;
  stages: Stage[];
  owners: OwnerOption[];
  companies: CompanyOption[];
  contactOptions: ContactOption[];
  sides: WorkspaceOptionChoice[];
  contactRoles: WorkspaceOptionChoice[];
  customFieldDefs: CustomFieldDef[];
  deal?: SerializedDealWithRelations;
  defaultCompanyId?: string;
  onSaved: (deal: SerializedDealWithRelations) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(deal);

  const [title, setTitle] = useState(deal?.title ?? "");
  const [stageId, setStageId] = useState(deal?.stageId ?? stages[0]?.id ?? "");
  const [companyId, setCompanyId] = useState(
    deal?.companyId ?? defaultCompanyId ?? "",
  );
  const [ownerId, setOwnerId] = useState(deal?.ownerId ?? "");
  const [side, setSide] = useState(deal?.side ?? "");
  const [amount, setAmount] = useState(
    deal?.amount ? deal.amount.toString() : "",
  );
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    toDateInputValue(deal?.expectedCloseDate),
  );
  const [source, setSource] = useState(deal?.source ?? "");
  const [contactRows, setContactRows] = useState<DealContactRow[]>(
    deal?.contacts.map((c) => ({
      contactId: c.contactId,
      role: c.role ?? "",
      isPrimary: c.isPrimary,
    })) ?? [],
  );
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, unknown>
  >(toCustomFieldRecord(deal?.customFields));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addContactRow() {
    const next = contactOptions.find(
      (c) => !contactRows.some((r) => r.contactId === c.id),
    );
    if (!next) return;
    setContactRows((prev) => [
      ...prev,
      { contactId: next.id, role: "", isPrimary: prev.length === 0 },
    ]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input = {
      title,
      stageId,
      companyId: companyId || null,
      ownerId: ownerId || null,
      side: side || null,
      amountCents: amount ? Math.round(Number(amount) * 100) : null,
      expectedCloseDate: expectedCloseDate || null,
      source: source || null,
      customFields: customFieldValues,
      contacts: contactRows
        .filter((r) => r.contactId)
        .map((r) => ({
          contactId: r.contactId,
          role: r.role || null,
          isPrimary: r.isPrimary,
        })),
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateDealAction(workspaceSlug, deal!.id, input)
        : await createDealAction(workspaceSlug, input);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(isEdit ? "Deal updated." : "Deal created.");
      router.refresh();
      // The action returns the plain `Deal` row; the caller (list/detail)
      // re-fetches relations via `router.refresh()`, so a cast here is
      // safe — only `id` is actually read off `onSaved`'s argument today.
      onSaved(result.data as unknown as SerializedDealWithRelations);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col gap-4 overflow-y-auto"
      noValidate
    >
      <SheetHeader>
        <SheetTitle>{isEdit ? "Edit deal" : "New deal"}</SheetTitle>
      </SheetHeader>

      <Field label="Title" error={error ?? undefined}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            invalid={Boolean(error)}
            required
            autoFocus
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Stage</Label>
          <Select value={stageId} onValueChange={setStageId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Field label="Amount" description="Dollars">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>
      </div>

      {sides.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label>Side</Label>
          <Select
            value={side || UNASSIGNED}
            onValueChange={(v) => setSide(v === UNASSIGNED ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>—</SelectItem>
              {sides.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

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

      <div className="grid grid-cols-2 gap-3">
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

        <Field label="Expected close">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Source">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Contacts</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addContactRow}
          >
            Add contact
          </Button>
        </div>
        {contactRows.length === 0 ? (
          <p className="text-fg-muted text-xs">No contacts linked yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {contactRows.map((row, index) => (
              <div
                key={index}
                className="border-border-strong flex items-center gap-2 rounded-md border p-2"
              >
                <select
                  value={row.contactId}
                  onChange={(e) =>
                    setContactRows((prev) =>
                      prev.map((r, i) =>
                        i === index ? { ...r, contactId: e.target.value } : r,
                      ),
                    )
                  }
                  className="border-border-strong bg-surface text-fg min-h-9 flex-1 rounded-md border px-2 text-sm"
                >
                  {contactOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {contactRoles.length > 0 ? (
                  <select
                    value={row.role}
                    onChange={(e) =>
                      setContactRows((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, role: e.target.value } : r,
                        ),
                      )
                    }
                    className="border-border-strong bg-surface text-fg min-h-9 rounded-md border px-2 text-sm"
                  >
                    <option value="">Role —</option>
                    {contactRoles.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  aria-label="Remove contact"
                  onClick={() =>
                    setContactRows((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="text-fg-muted hover:text-danger cursor-pointer p-1"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
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
          {isEdit ? "Save changes" : "Create deal"}
        </Button>
      </SheetFooter>
    </form>
  );
}
