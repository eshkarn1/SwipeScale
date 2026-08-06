"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { PaginationBar } from "@/components/app/pagination-bar";
import { SavedViewMenu } from "@/components/app/saved-view-menu";
import { useListParams } from "@/components/app/use-list-params";
import {
  restoreContactAction,
  softDeleteContactAction,
} from "@/server/actions/contact";

import {
  ContactFormSheet,
  type CompanyOption,
  type OwnerOption,
} from "./contact-form";

import type { ContactWithCompany } from "@/server/services/contact";
import type { CustomFieldDef, SavedView } from "@/generated/prisma/client";
import type { PageResult } from "@/lib/pagination";

const ALL = "__all__";

export function ContactsClient({
  workspaceSlug,
  data,
  companies,
  owners,
  customFieldDefs,
  savedViews,
}: {
  workspaceSlug: string;
  data: PageResult<ContactWithCompany>;
  companies: CompanyOption[];
  owners: OwnerOption[];
  customFieldDefs: CustomFieldDef[];
  savedViews: SavedView[];
}) {
  const { get, setParams, setPage } = useListParams();
  const q = get("q") ?? "";
  const companyId = get("companyId") ?? "";
  const showDeleted = get("deleted") === "1";
  const sort = get("sort") ?? "lastName";
  const dir = get("dir") ?? "asc";

  const [searchValue, setSearchValue] = useState(q);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ContactWithCompany | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleSort(field: string) {
    if (sort === field) {
      setParams(
        { sort: field, dir: dir === "asc" ? "desc" : "asc" },
        { resetPage: false },
      );
    } else {
      setParams({ sort: field, dir: "asc" }, { resetPage: false });
    }
  }

  function handleDelete(contact: ContactWithCompany) {
    startTransition(async () => {
      const result = await softDeleteContactAction(workspaceSlug, contact.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Deleted "${contact.firstName} ${contact.lastName ?? ""}".`,
      );
    });
  }

  function handleRestore(contact: ContactWithCompany) {
    startTransition(async () => {
      const result = await restoreContactAction(workspaceSlug, contact.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Restored "${contact.firstName} ${contact.lastName ?? ""}".`,
      );
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New contact
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ q: searchValue || null });
          }}
          className="min-w-56 flex-1"
        >
          <div className="relative">
            <Search
              className="text-fg-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search contacts…"
              aria-label="Search contacts"
              className="pl-9"
            />
          </div>
        </form>

        <Select
          value={companyId || ALL}
          onValueChange={(v) => setParams({ companyId: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SavedViewMenu
          workspaceSlug={workspaceSlug}
          entity="contact"
          views={savedViews}
        />

        <Button
          variant={showDeleted ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setParams({ deleted: showDeleted ? null : "1" })}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {showDeleted ? "Showing trash" : "Trash"}
        </Button>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={showDeleted ? "No deleted contacts" : "No contacts yet"}
          description={
            showDeleted
              ? "Contacts you delete show up here until they're restored."
              : "Add your first contact to start tracking who you talk to."
          }
          action={
            showDeleted ? undefined : (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                New contact
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border bg-surface text-fg-muted border-b text-xs tracking-wide uppercase">
                  <SortableHeader
                    label="Name"
                    field="lastName"
                    sort={sort}
                    dir={dir}
                    onSort={toggleSort}
                  />
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="w-11 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-border h-row border-b last:border-b-0"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/${workspaceSlug}/contacts/${contact.id}`}
                        className="text-fg hover:text-accent-text font-medium"
                      >
                        {contact.firstName} {contact.lastName ?? ""}
                      </Link>
                    </td>
                    <td className="text-fg-muted px-4 py-2">
                      {contact.company ? (
                        <Link
                          href={`/${workspaceSlug}/companies/${contact.company.id}`}
                          className="hover:text-fg"
                        >
                          {contact.company.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-fg-muted px-4 py-2">
                      {contact.email ?? "—"}
                    </td>
                    <td className="text-fg-muted px-4 py-2 font-mono">
                      {contact.phone ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${contact.firstName} ${contact.lastName ?? ""}`}
                          >
                            <MoreHorizontal
                              className="size-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </DropdownTrigger>
                        <DropdownContent align="end">
                          {showDeleted ? (
                            <DropdownItem
                              onSelect={() => handleRestore(contact)}
                              disabled={isPending}
                            >
                              <RotateCcw
                                className="size-4"
                                aria-hidden="true"
                              />
                              Restore
                            </DropdownItem>
                          ) : (
                            <>
                              <DropdownItem
                                onSelect={() => setEditing(contact)}
                              >
                                Edit
                              </DropdownItem>
                              <DropdownItem
                                destructive
                                onSelect={() => handleDelete(contact)}
                                disabled={isPending}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                                Delete
                              </DropdownItem>
                            </>
                          )}
                        </DropdownContent>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}

      <ContactFormSheet
        workspaceSlug={workspaceSlug}
        open={createOpen}
        onOpenChange={setCreateOpen}
        owners={owners}
        companies={companies}
        customFieldDefs={customFieldDefs}
      />
      <ContactFormSheet
        workspaceSlug={workspaceSlug}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        owners={owners}
        companies={companies}
        customFieldDefs={customFieldDefs}
        contact={editing ?? undefined}
      />
    </div>
  );
}

function SortableHeader({
  label,
  field,
  sort,
  dir,
  onSort,
}: {
  label: string;
  field: string;
  sort: string;
  dir: string;
  onSort: (field: string) => void;
}) {
  const active = sort === field;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="hover:text-fg flex cursor-pointer items-center gap-1"
      >
        {label}
        {active ? (
          <Badge variant="accent">{dir === "asc" ? "↑" : "↓"}</Badge>
        ) : null}
      </button>
    </th>
  );
}
