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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/${workspaceSlug}/companies`}
        className="text-fg-muted hover:text-fg mb-4 inline-block text-sm"
      >
        ← Companies
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
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
              aria-label="Company actions"
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-6">
          <section className="border-border bg-surface rounded-lg border p-5">
            <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
              Overview
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Domain" value={company.domain} />
              <Field label="Industry" value={company.industry} />
              <Field
                label="Employees"
                value={company.employees?.toString() ?? null}
              />
              <Field
                label="Annual revenue"
                value={
                  company.annualRevenue
                    ? formatCurrency(decimalToMinorUnits(company.annualRevenue))
                    : null
                }
              />
              <Field label="City" value={company.addressCity} />
              <Field label="Country" value={company.addressCountry} />
              <Field label="Owner" value={ownerLabel} />
              <Field
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
          </section>

          {customFieldDefs.length > 0 ? (
            <section className="border-border bg-surface rounded-lg border p-5">
              <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
                Custom fields
              </h2>
              <CustomFieldsView
                defs={customFieldDefs}
                values={company.customFields}
              />
            </section>
          ) : null}

          <section className="border-border bg-surface rounded-lg border p-5">
            <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
              Deals ({deals.length})
            </h2>
            {deals.length === 0 ? (
              <p className="text-fg-muted text-sm">
                No deals for this company yet.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {deals.map((deal) => (
                  <li key={deal.id} className="py-2">
                    <Link
                      href={`/${workspaceSlug}/deals/${deal.id}`}
                      className="text-fg hover:text-accent-text text-sm font-medium"
                    >
                      {deal.title}
                    </Link>
                    <span className="text-fg-muted ml-2 font-mono text-xs">
                      {formatCurrency(decimalToMinorUnits(deal.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="border-border bg-surface rounded-lg border p-5">
          <h2 className="text-fg-muted mb-4 text-xs font-medium tracking-wide uppercase">
            Contacts ({contacts.length})
          </h2>
          {contacts.length === 0 ? (
            <p className="text-fg-muted text-sm">No contacts linked yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <Link
                    href={`/${workspaceSlug}/contacts/${contact.id}`}
                    className="text-fg hover:text-accent-text text-sm"
                  >
                    {contact.firstName} {contact.lastName ?? ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <CompanyFormSheet
        workspaceSlug={workspaceSlug}
        open={editOpen}
        onOpenChange={setEditOpen}
        owners={owners}
        customFieldDefs={customFieldDefs}
        company={company}
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
