"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Activity,
  ExternalLink,
  FileText,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { decimalToMinorUnits, formatCurrency } from "@/lib/money";
import { CustomFieldsView } from "@/components/app/custom-fields-view";
import {
  NotYetTab,
  RailSection,
  RecordField,
  RecordMeta,
  RecordShell,
  type RecordAction,
} from "@/components/app/record-shell";
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
  const fullName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

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

  const actions: RecordAction[] = isDeleted
    ? [
        {
          label: "Restore",
          icon: RotateCcw,
          disabled: isPending,
          onSelect: handleRestore,
        },
      ]
    : [
        { label: "Edit", icon: Pencil, onSelect: () => setEditOpen(true) },
        {
          label: "Delete",
          icon: Trash2,
          destructive: true,
          disabled: isPending,
          onSelect: handleDelete,
        },
      ];

  return (
    <>
      <RecordShell
        backHref={`/${workspaceSlug}/contacts`}
        backLabel="Contacts"
        title={fullName}
        subtitle={contact.jobTitle}
        deleted={isDeleted}
        actionsLabel="Contact actions"
        actions={actions}
        summary={
          <dl className="flex flex-col gap-3 text-sm">
            <RecordField label="Email" value={contact.email} />
            <RecordField
              label="Phone"
              value={
                contact.phone ? (
                  <span className="font-mono">{contact.phone}</span>
                ) : null
              }
            />
            <RecordField
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
            <RecordField label="Owner" value={ownerLabel} />
            <RecordField
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
        }
        tabs={[
          {
            value: "overview",
            label: "Overview",
            content: (
              <div className="flex flex-col gap-6">
                <section>
                  <h2 className="text-fg-muted mb-3 text-xs font-medium tracking-wide uppercase">
                    Details
                  </h2>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                    <RecordField label="First name" value={contact.firstName} />
                    <RecordField label="Last name" value={contact.lastName} />
                    <RecordField label="Email" value={contact.email} />
                    <RecordField label="Phone" value={contact.phone} />
                    <RecordField label="Job title" value={contact.jobTitle} />
                    <RecordField label="Owner" value={ownerLabel} />
                  </dl>
                </section>

                {customFieldDefs.length > 0 ? (
                  <section>
                    <h2 className="text-fg-muted mb-3 text-xs font-medium tracking-wide uppercase">
                      Custom fields
                    </h2>
                    <CustomFieldsView
                      defs={customFieldDefs}
                      values={contact.customFields}
                    />
                  </section>
                ) : null}
              </div>
            ),
          },
          {
            value: "activity",
            label: "Activity",
            content: (
              <NotYetTab
                icon={Activity}
                title="No activity yet"
                description="Notes, tasks, calls and meetings attached to this record will appear here as a timeline."
              />
            ),
          },
          {
            value: "deals",
            label: "Deals",
            content:
              deals.length === 0 ? (
                <p className="text-fg-muted text-sm">
                  No deals for this contact yet.
                </p>
              ) : (
                // The dual-role query DECISIONS §8.6 exists for: the same
                // person can hold a different role on every deal, and the
                // role label is workspace vocabulary, never a literal.
                <ul className="divide-border divide-y">
                  {deals.map(({ deal, role, isPrimary }) => (
                    <li
                      key={deal.id}
                      className="min-h-row flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/${workspaceSlug}/deals/${deal.id}`}
                          className="text-fg hover:text-accent-text truncate text-sm font-medium"
                        >
                          {deal.title}
                        </Link>
                        <span className="text-fg-muted ml-2 font-mono text-xs">
                          {formatCurrency(
                            decimalToMinorUnits(deal.amount),
                            deal.currency,
                          )}
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
              ),
          },
          {
            value: "files",
            label: "Files",
            content: (
              <NotYetTab
                icon={FileText}
                title="No files yet"
                description="Documents attached to this record will be listed here."
              />
            ),
          },
        ]}
        rail={
          <>
            <RailSection title="Company">
              {contact.company ? (
                <Link
                  href={`/${workspaceSlug}/companies/${contact.company.id}`}
                  className="text-fg hover:text-accent-text flex min-h-11 items-center truncate text-sm"
                >
                  {contact.company.name}
                </Link>
              ) : (
                <p className="text-fg-muted text-sm">
                  Not linked to a company.
                </p>
              )}
            </RailSection>
            <RecordMeta
              createdAt={contact.createdAt}
              updatedAt={contact.updatedAt}
            />
          </>
        }
      />

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
    </>
  );
}
