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
  restoreCompanyAction,
  softDeleteCompanyAction,
} from "@/server/actions/company";
import type { SerializedCompany, SerializedDeal } from "@/lib/serialize";

import { CompanyFormSheet, type OwnerOption } from "../company-form";

import type { Contact, CustomFieldDef } from "@/generated/prisma/client";

export function CompanyDetailClient({
  workspaceSlug,
  company,
  ownerLabel,
  owners,
  customFieldDefs,
  contacts,
  deals,
}: {
  workspaceSlug: string;
  company: SerializedCompany;
  ownerLabel: string | null;
  owners: OwnerOption[];
  customFieldDefs: CustomFieldDef[];
  contacts: Contact[];
  deals: SerializedDeal[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDeleted = company.deletedAt !== null;

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteCompanyAction(workspaceSlug, company.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${company.name}".`);
      router.refresh();
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreCompanyAction(workspaceSlug, company.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored "${company.name}".`);
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
        backHref={`/${workspaceSlug}/companies`}
        backLabel="Companies"
        title={company.name}
        subtitle={company.industry}
        deleted={isDeleted}
        actionsLabel="Company actions"
        actions={actions}
        summary={
          <dl className="flex flex-col gap-3 text-sm">
            <RecordField label="Domain" value={company.domain} />
            <RecordField label="Owner" value={ownerLabel} />
            <RecordField
              label="Employees"
              value={
                company.employees !== null ? (
                  <span className="font-mono">{company.employees}</span>
                ) : null
              }
            />
            <RecordField
              label="Annual revenue"
              value={
                company.annualRevenue ? (
                  <span className="font-mono">
                    {formatCurrency(decimalToMinorUnits(company.annualRevenue))}
                  </span>
                ) : null
              }
            />
            <RecordField
              label="Location"
              value={
                [company.addressCity, company.addressCountry]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />
            <RecordField
              label="LinkedIn"
              value={
                company.linkedinUrl ? (
                  <a
                    href={company.linkedinUrl}
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
                    <RecordField label="Name" value={company.name} />
                    <RecordField label="Domain" value={company.domain} />
                    <RecordField label="Industry" value={company.industry} />
                    <RecordField label="Owner" value={ownerLabel} />
                    <RecordField label="City" value={company.addressCity} />
                    <RecordField
                      label="Country"
                      value={company.addressCountry}
                    />
                  </dl>
                </section>

                {customFieldDefs.length > 0 ? (
                  <section>
                    <h2 className="text-fg-muted mb-3 text-xs font-medium tracking-wide uppercase">
                      Custom fields
                    </h2>
                    <CustomFieldsView
                      defs={customFieldDefs}
                      values={company.customFields}
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
                  No deals for this company yet.
                </p>
              ) : (
                <ul className="divide-border divide-y">
                  {deals.map((deal) => (
                    <li
                      key={deal.id}
                      className="min-h-row flex items-center justify-between gap-3"
                    >
                      <Link
                        href={`/${workspaceSlug}/deals/${deal.id}`}
                        className="text-fg hover:text-accent-text truncate text-sm font-medium"
                      >
                        {deal.title}
                      </Link>
                      <span className="text-fg-muted shrink-0 font-mono text-xs">
                        {formatCurrency(
                          decimalToMinorUnits(deal.amount),
                          deal.currency,
                        )}
                      </span>
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
            <RailSection title={`Contacts (${contacts.length})`}>
              {contacts.length === 0 ? (
                <p className="text-fg-muted text-sm">No contacts linked yet.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {contacts.map((contact) => (
                    <li key={contact.id}>
                      <Link
                        href={`/${workspaceSlug}/contacts/${contact.id}`}
                        className="text-fg hover:text-accent-text flex min-h-11 items-center truncate text-sm"
                      >
                        {contact.firstName} {contact.lastName ?? ""}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </RailSection>
            <RecordMeta
              createdAt={company.createdAt}
              updatedAt={company.updatedAt}
            />
          </>
        }
      />

      <CompanyFormSheet
        workspaceSlug={workspaceSlug}
        open={editOpen}
        onOpenChange={setEditOpen}
        owners={owners}
        customFieldDefs={customFieldDefs}
        company={company}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
