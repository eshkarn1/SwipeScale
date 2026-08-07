"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, RotateCcw, Search, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  DataGrid,
  FilterChips,
  type ColumnDef,
  type FilterChip,
  type GridAction,
} from "@/components/app/data-grid";
import { PaginationBar } from "@/components/app/pagination-bar";
import { SavedViewMenu } from "@/components/app/saved-view-menu";
import {
  sortingFromParam,
  sortingToParam,
  useListParams,
  visibilityFromParam,
  visibilityToParam,
} from "@/components/app/use-list-params";
import {
  restoreContactAction,
  softDeleteContactAction,
  updateContactAction,
} from "@/server/actions/contact";

import {
  ContactFormSheet,
  type CompanyOption,
  type OwnerOption,
} from "./contact-form";

import type { ContactWithCompany } from "@/server/services/contact";
import type { CustomFieldDef, SavedView } from "@/generated/prisma/client";
import type { CursorPage } from "@/lib/pagination";

const ALL = "__all__";

function contactName(contact: ContactWithCompany) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

export function ContactsClient({
  workspaceSlug,
  data,
  companies,
  owners,
  customFieldDefs,
  savedViews,
}: {
  workspaceSlug: string;
  data: CursorPage<ContactWithCompany>;
  companies: CompanyOption[];
  owners: OwnerOption[];
  customFieldDefs: CustomFieldDef[];
  savedViews: SavedView[];
}) {
  const { get, setParams, navigate } = useListParams();
  const q = get("q") ?? "";
  const companyId = get("companyId") ?? "";
  const owner = get("owner") ?? "";
  const showDeleted = get("deleted") === "1";

  const sorting = sortingFromParam(get("sort"));
  const columnVisibility = visibilityFromParam(get("hidden"));

  const [searchValue, setSearchValue] = useState(q);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ContactWithCompany | null>(null);
  const [, startTransition] = useTransition();

  const ownerById = useMemo(
    () => new Map(owners.map((o) => [o.id, o.label])),
    [owners],
  );
  const companyById = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const columns = useMemo<ColumnDef<ContactWithCompany>[]>(
    () => [
      {
        id: "firstName",
        header: "First name",
        accessorFn: (row) => row.firstName,
        cell: (ctx) => (
          <span className="text-fg truncate font-medium">
            {ctx.row.original.firstName}
          </span>
        ),
        meta: {
          locked: true,
          edit: { kind: "text", value: (row) => row.firstName },
        },
      },
      {
        id: "lastName",
        header: "Last name",
        accessorFn: (row) => row.lastName ?? "",
        cell: (ctx) => (
          <span className="text-fg truncate font-medium">
            {ctx.row.original.lastName ?? "—"}
          </span>
        ),
        meta: { edit: { kind: "text", value: (row) => row.lastName ?? "" } },
      },
      {
        id: "company",
        header: "Company",
        // A relation, set through the picker on the edit Sheet — free-texting
        // a company name here would have to guess which record was meant.
        enableSorting: false,
        accessorFn: (row) => row.company?.name ?? "",
        cell: (ctx) => {
          const company = ctx.row.original.company;
          return company ? (
            <Link
              href={`/${workspaceSlug}/companies/${company.id}`}
              className="text-fg-muted hover:text-accent-text truncate"
              // The cell itself is the grid's focus target; a second tab stop
              // inside it would break the single-tab-stop grid contract.
              tabIndex={-1}
            >
              {company.name}
            </Link>
          ) : (
            <span className="text-fg-muted">—</span>
          );
        },
      },
      {
        id: "email",
        header: "Email",
        accessorFn: (row) => row.email ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted truncate">
            {ctx.row.original.email ?? "—"}
          </span>
        ),
        meta: { edit: { kind: "text", value: (row) => row.email ?? "" } },
      },
      {
        id: "phone",
        header: "Phone",
        enableSorting: false,
        accessorFn: (row) => row.phone ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted font-mono">
            {ctx.row.original.phone ?? "—"}
          </span>
        ),
        meta: { edit: { kind: "text", value: (row) => row.phone ?? "" } },
      },
      {
        id: "jobTitle",
        header: "Job title",
        accessorFn: (row) => row.jobTitle ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted truncate">
            {ctx.row.original.jobTitle ?? "—"}
          </span>
        ),
        meta: { edit: { kind: "text", value: (row) => row.jobTitle ?? "" } },
      },
    ],
    [workspaceSlug],
  );

  const chips: FilterChip[] = [];
  if (q) {
    chips.push({
      id: "q",
      label: "Search",
      value: q,
      onClear: () => {
        setSearchValue("");
        setParams({ q: null });
      },
    });
  }
  if (companyId) {
    chips.push({
      id: "companyId",
      label: "Company",
      value: companyById.get(companyId) ?? companyId,
      onClear: () => setParams({ companyId: null }),
    });
  }
  if (owner) {
    chips.push({
      id: "owner",
      label: "Owner",
      value: ownerById.get(owner) ?? owner,
      onClear: () => setParams({ owner: null }),
    });
  }
  if (showDeleted) {
    chips.push({
      id: "deleted",
      label: "View",
      value: "Trash",
      onClear: () => setParams({ deleted: null }),
    });
  }

  function handleDelete(contact: ContactWithCompany) {
    startTransition(async () => {
      const result = await softDeleteContactAction(workspaceSlug, contact.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${contactName(contact)}".`);
    });
  }

  function handleRestore(contact: ContactWithCompany) {
    startTransition(async () => {
      const result = await restoreContactAction(workspaceSlug, contact.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored "${contactName(contact)}".`);
    });
  }

  async function commitCell(
    contact: ContactWithCompany,
    columnId: string,
    raw: string,
  ): Promise<string | null> {
    const value = raw.trim();
    let input: Record<string, unknown>;

    switch (columnId) {
      case "firstName":
        if (value.length === 0) return "First name is required.";
        if (value === contact.firstName) return null;
        input = { firstName: value };
        break;
      case "lastName":
        if (value === (contact.lastName ?? "")) return null;
        input = { lastName: value || null };
        break;
      case "email":
        if (value === (contact.email ?? "")) return null;
        input = { email: value || null };
        break;
      case "phone":
        if (value === (contact.phone ?? "")) return null;
        input = { phone: value || null };
        break;
      case "jobTitle":
        if (value === (contact.jobTitle ?? "")) return null;
        input = { jobTitle: value || null };
        break;
      default:
        return null;
    }

    const result = await updateContactAction(workspaceSlug, contact.id, input);
    if (!result.ok) {
      toast.error(result.error);
      return result.error;
    }
    return null;
  }

  function rowActions(contact: ContactWithCompany): GridAction[] {
    if (showDeleted) {
      return [
        {
          label: "Restore",
          icon: RotateCcw,
          onSelect: () => handleRestore(contact),
        },
      ];
    }
    return [
      {
        label: "Edit details",
        icon: Pencil,
        onSelect: () => setEditing(contact),
      },
      {
        label: "Delete",
        icon: Trash2,
        destructive: true,
        onSelect: () => handleDelete(contact),
      },
    ];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New contact
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
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

        <Select
          value={owner || ALL}
          onValueChange={(v) => setParams({ owner: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All owners</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
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

      {chips.length > 0 ? (
        <div className="mb-3">
          <FilterChips chips={chips} />
        </div>
      ) : null}

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
          <DataGrid
            label="Contacts"
            rows={data.items}
            columns={columns}
            rowId={(row) => row.id}
            rowHref={(row) => `/${workspaceSlug}/contacts/${row.id}`}
            rowLabel={contactName}
            actions={rowActions}
            sorting={sorting}
            onSortingChange={(next) =>
              setParams({ sort: sortingToParam(next) })
            }
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={(next) =>
              setParams(
                { hidden: visibilityToParam(next) },
                { resetCursor: false },
              )
            }
            onCommitCell={commitCell}
            readOnly={showDeleted}
          />
          <PaginationBar
            total={data.total}
            shown={data.items.length}
            prevCursor={data.prevCursor}
            nextCursor={data.nextCursor}
            onNavigate={navigate}
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
