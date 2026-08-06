"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";

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
import {
  restoreContactAction,
  softDeleteContactAction,
} from "@/server/actions/contact";

import {
  ContactFormSheet,
  type CompanyOption,
  type OwnerOption,
} from "../contact-form";

import type { ContactWithCompany } from "@/server/services/contact";
import type { CustomFieldDef } from "@/generated/prisma/client";
import type { SerializedDeal } from "@/lib/serialize";

export function ContactDetailClient({
  workspaceSlug,
  contact,
  ownerLabel,
  owners,
  companies,
  customFieldDefs,
  deals,
  roleLabels,
}: {
  workspaceSlug: string;
  contact: ContactWithCompany;
  ownerLabel: string | null;
  owners: OwnerOption[];
  companies: CompanyOption[];
  customFieldDefs: CustomFieldDef[];
  deals: { deal: SerializedDeal; role: string | null; isPrimary: boolean }[];
  /** `WorkspaceOption.value` -> `.label`, for `deal_contact_role` — a
   * workspace can rename "Seller" to "Vendor" (DECISIONS §8.6), so the
   * stored `value` is never shown to a user directly. */
  roleLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDeleted = contact.deletedAt !== null;
  const fullName = `${contact.firstName} ${contact.lastName ?? ""}`.trim();

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteContactAction(workspaceSlug, contact.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${fullName}".`);
      router.refresh();
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreContactAction(workspaceSlug, contact.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored "${fullName}".`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/${workspaceSlug}/contacts`}
        className="text-fg-muted hover:text-fg mb-4 inline-block text-sm"
      >
        ← Contacts
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{fullName}</h1>
          {contact.jobTitle ? (
            <p className="text-fg-muted text-sm">{contact.jobTitle}</p>
          ) : null}
          {isDeleted ? (
            <Badge variant="danger" className="mt-2">
              Deleted
            </Badge>
          ) : null}
        </div>
        <Dropdown>
          <DropdownTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Contact actions"
            >
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
            <Field label="Email" value={contact.email} />
            <Field label="Phone" value={contact.phone} />
            <Field
              label="Company"
              value={
                contact.company ? (
                  <Link
                    href={`/${workspaceSlug}/companies/${contact.company.id}`}
                    className="text-accent-text hover:underline"
                  >
                    {contact.company.name}
                  </Link>
                ) : null
              }
            />
            <Field label="Owner" value={ownerLabel} />
            <Field
              label="LinkedIn"
              value={
                contact.linkedinUrl ? (
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-text inline-flex items-center gap-1 hover:underline"
                  >
                    Profile{" "}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : null
              }
            />
          </dl>
        </section>

        {customFieldDefs.length > 0 ? (
          <section className="border-border bg-surface rounded-lg border p-5">
            <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
              Custom fields
            </h2>
            <CustomFieldsView
              defs={customFieldDefs}
              values={contact.customFields}
            />
          </section>
        ) : null}

        <section className="border-border bg-surface rounded-lg border p-5">
          <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
            Deals ({deals.length})
          </h2>
          {deals.length === 0 ? (
            <p className="text-fg-muted text-sm">
              No deals for this contact yet.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {deals.map(({ deal, role, isPrimary }) => (
                <li
                  key={deal.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <Link
                      href={`/${workspaceSlug}/deals/${deal.id}`}
                      className="text-fg hover:text-accent-text text-sm font-medium"
                    >
                      {deal.title}
                    </Link>
                    <span className="text-fg-muted ml-2 font-mono text-xs">
                      {formatCurrency(decimalToMinorUnits(deal.amount))}
                    </span>
                  </div>
                  {role ? (
                    <Badge variant={isPrimary ? "accent" : "neutral"}>
                      {roleLabels[role] ?? role}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ContactFormSheet
        workspaceSlug={workspaceSlug}
        open={editOpen}
        onOpenChange={setEditOpen}
        owners={owners}
        companies={companies}
        customFieldDefs={customFieldDefs}
        contact={contact}
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
