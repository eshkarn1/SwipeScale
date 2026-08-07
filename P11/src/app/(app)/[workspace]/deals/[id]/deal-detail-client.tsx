"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Activity, FileText, Pencil, RotateCcw, Trash2 } from "lucide-react";

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
import { restoreDealAction, softDeleteDealAction } from "@/server/actions/deal";

import {
  DealFormSheet,
  type CompanyOption,
  type ContactOption,
  type OwnerOption,
  type WorkspaceOptionChoice,
} from "../deal-form";

import type {
  SerializedDeal,
  SerializedDealWithRelations,
} from "@/lib/serialize";
import type { CustomFieldDef, Stage } from "@/generated/prisma/client";

export function DealDetailClient({
  workspaceSlug,
  deal,
  relatedDeals,
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
  /** Other deals for the same company — see the Deals tab. */
  relatedDeals: SerializedDeal[];
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
  // Both vocabularies are `WorkspaceOption` rows seeded from the workspace's
  // vertical preset (DECISIONS §8.6). A workspace with no `deal_side`
  // options simply never renders the badge.
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
        backHref={`/${workspaceSlug}/deals`}
        backLabel="Deals"
        title={deal.title}
        subtitle={deal.company?.name ?? null}
        deleted={isDeleted}
        actionsLabel="Deal actions"
        actions={actions}
        summary={
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
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
            </div>

            <dl className="flex flex-col gap-3 text-sm">
              <RecordField
                label="Amount"
                value={
                  <span className="font-mono text-base">
                    {formatCurrency(
                      decimalToMinorUnits(deal.amount),
                      deal.currency,
                    )}
                  </span>
                }
              />
              <RecordField
                label="Expected close"
                value={
                  deal.expectedCloseDate ? (
                    <span className="font-mono">
                      {new Date(deal.expectedCloseDate).toLocaleDateString()}
                    </span>
                  ) : null
                }
              />
              <RecordField
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
              <RecordField label="Owner" value={ownerLabel} />
              <RecordField label="Source" value={deal.source} />
            </dl>
          </div>
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
                    <RecordField label="Title" value={deal.title} />
                    <RecordField label="Stage" value={deal.stage.name} />
                    <RecordField
                      label="Amount"
                      value={
                        <span className="font-mono">
                          {formatCurrency(
                            decimalToMinorUnits(deal.amount),
                            deal.currency,
                          )}
                        </span>
                      }
                    />
                    <RecordField label="Currency" value={deal.currency} />
                    <RecordField label="Source" value={deal.source} />
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
                      values={deal.customFields}
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
              relatedDeals.length === 0 ? (
                <p className="text-fg-muted text-sm">
                  {deal.company
                    ? `No other deals for ${deal.company.name}.`
                    : "This deal isn't linked to a company, so there are no related deals to show."}
                </p>
              ) : (
                <ul className="divide-border divide-y">
                  {relatedDeals.map((related) => (
                    <li
                      key={related.id}
                      className="min-h-row flex items-center justify-between gap-3"
                    >
                      <Link
                        href={`/${workspaceSlug}/deals/${related.id}`}
                        className="text-fg hover:text-accent-text truncate text-sm font-medium"
                      >
                        {related.title}
                      </Link>
                      <span className="text-fg-muted shrink-0 font-mono text-xs">
                        {formatCurrency(
                          decimalToMinorUnits(related.amount),
                          related.currency,
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
            <RailSection title={`Contacts (${deal.contacts.length})`}>
              {deal.contacts.length === 0 ? (
                <p className="text-fg-muted text-sm">No contacts linked yet.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {deal.contacts.map((dc) => (
                    <li
                      key={dc.contactId}
                      className="flex min-h-11 items-center justify-between gap-2"
                    >
                      <Link
                        href={`/${workspaceSlug}/contacts/${dc.contactId}`}
                        className="text-fg hover:text-accent-text truncate text-sm"
                      >
                        {contactLabelById.get(dc.contactId) ??
                          `${dc.contact.firstName} ${dc.contact.lastName ?? ""}`}
                      </Link>
                      {dc.role ? (
                        <Badge variant={dc.isPrimary ? "accent" : "neutral"}>
                          {contactRoles.find((r) => r.value === dc.role)
                            ?.label ?? dc.role}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </RailSection>
            <RecordMeta createdAt={deal.createdAt} updatedAt={deal.updatedAt} />
          </>
        }
      />

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
    </>
  );
}
