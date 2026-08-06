"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toast";
import { decimalToMinorUnits, formatCurrency } from "@/lib/money";
import { CustomFieldsView } from "@/components/app/custom-fields-view";
import { restoreDealAction, softDeleteDealAction } from "@/server/actions/deal";

import {
  DealFormSheet,
  type CompanyOption,
  type ContactOption,
  type OwnerOption,
  type WorkspaceOptionChoice,
} from "../deal-form";

import type { SerializedDealWithRelations } from "@/lib/serialize";
import type { CustomFieldDef, Stage } from "@/generated/prisma/client";

export function DealDetailClient({
  workspaceSlug,
  deal,
  ownerLabel,
  owners,
  companies,
  contactOptions,
  stages,
  sides,
  contactRoles,
  customFieldDefs,
}: {
  workspaceSlug: string;
  deal: SerializedDealWithRelations;
  ownerLabel: string | null;
  owners: OwnerOption[];
  companies: CompanyOption[];
  contactOptions: ContactOption[];
  stages: Stage[];
  sides: WorkspaceOptionChoice[];
  contactRoles: WorkspaceOptionChoice[];
  customFieldDefs: CustomFieldDef[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDeleted = deal.deletedAt !== null;
  const sideLabel = deal.side
    ? (sides.find((s) => s.value === deal.side)?.label ?? deal.side)
    : null;
  const contactLabelById = new Map(contactOptions.map((c) => [c.id, c.label]));

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteDealAction(workspaceSlug, deal.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${deal.title}".`);
      router.refresh();
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreDealAction(workspaceSlug, deal.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored "${deal.title}".`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/${workspaceSlug}/deals`}
        className="text-fg-muted hover:text-fg mb-4 inline-block text-sm"
      >
        ← Deals
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{deal.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant={
                deal.stage.type === "WON"
                  ? "accent"
                  : deal.stage.type === "LOST"
                    ? "danger"
                    : "neutral"
              }
            >
              {deal.stage.name}
            </Badge>
            {sideLabel ? <Badge variant="outline">{sideLabel}</Badge> : null}
            {isDeleted ? <Badge variant="danger">Deleted</Badge> : null}
          </div>
        </div>
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="secondary" size="icon" aria-label="Deal actions">
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            {isDeleted ? (
              <DropdownItem onSelect={handleRestore} disabled={isPending}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Restore
              </DropdownItem>
            ) : (
              <>
                <DropdownItem onSelect={() => setEditOpen(true)}>
                  Edit
                </DropdownItem>
                <DropdownItem
                  destructive
                  onSelect={handleDelete}
                  disabled={isPending}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </DropdownItem>
              </>
            )}
          </DropdownContent>
        </Dropdown>
      </div>

      <div className="flex flex-col gap-6">
        <section className="border-border bg-surface rounded-lg border p-5">
          <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
            Overview
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field
              label="Amount"
              value={formatCurrency(
                decimalToMinorUnits(deal.amount),
                deal.currency,
              )}
            />
            <Field
              label="Expected close"
              value={
                deal.expectedCloseDate
                  ? new Date(deal.expectedCloseDate).toLocaleDateString()
                  : null
              }
            />
            <Field
              label="Company"
              value={
                deal.company ? (
                  <Link
                    href={`/${workspaceSlug}/companies/${deal.company.id}`}
                    className="text-accent-text hover:underline"
                  >
                    {deal.company.name}
                  </Link>
                ) : null
              }
            />
            <Field label="Owner" value={ownerLabel} />
            <Field label="Source" value={deal.source} />
          </dl>
        </section>

        {customFieldDefs.length > 0 ? (
          <section className="border-border bg-surface rounded-lg border p-5">
            <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
              Custom fields
            </h2>
            <CustomFieldsView
              defs={customFieldDefs}
              values={deal.customFields}
            />
          </section>
        ) : null}

        <section className="border-border bg-surface rounded-lg border p-5">
          <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
            Contacts ({deal.contacts.length})
          </h2>
          {deal.contacts.length === 0 ? (
            <p className="text-fg-muted text-sm">No contacts linked yet.</p>
          ) : (
            <ul className="divide-border divide-y">
              {deal.contacts.map((dc) => (
                <li
                  key={dc.contactId}
                  className="flex items-center justify-between py-2"
                >
                  <Link
                    href={`/${workspaceSlug}/contacts/${dc.contactId}`}
                    className="text-fg hover:text-accent-text text-sm font-medium"
                  >
                    {contactLabelById.get(dc.contactId) ??
                      `${dc.contact.firstName} ${dc.contact.lastName ?? ""}`}
                  </Link>
                  {dc.role ? (
                    <Badge variant={dc.isPrimary ? "accent" : "neutral"}>
                      {contactRoles.find((r) => r.value === dc.role)?.label ??
                        dc.role}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DealFormSheet
        workspaceSlug={workspaceSlug}
        open={editOpen}
        onOpenChange={setEditOpen}
        stages={stages}
        owners={owners}
        companies={companies}
        contactOptions={contactOptions}
        sides={sides}
        contactRoles={contactRoles}
        customFieldDefs={customFieldDefs}
        deal={deal}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-fg-muted text-xs tracking-wide uppercase">{label}</dt>
      <dd className="text-fg mt-0.5">{value ?? "—"}</dd>
    </div>
  );
}
