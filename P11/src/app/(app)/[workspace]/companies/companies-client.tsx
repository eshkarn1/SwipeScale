"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

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
import { decimalToMinorUnits, formatCurrency } from "@/lib/money";
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
  restoreCompanyAction,
  softDeleteCompanyAction,
  updateCompanyAction,
} from "@/server/actions/company";

import { CompanyFormSheet, type OwnerOption } from "./company-form";

import type { CustomFieldDef, SavedView } from "@/generated/prisma/client";
import type { CursorPage } from "@/lib/pagination";
import type { SerializedCompany } from "@/lib/serialize";

const ALL = "__all__";

export function CompaniesClient({
  workspaceSlug,
  data,
  industries,
  owners,
  customFieldDefs,
  savedViews,
}: {
  workspaceSlug: string;
  data: CursorPage<SerializedCompany>;
  industries: string[];
  owners: OwnerOption[];
  customFieldDefs: CustomFieldDef[];
  savedViews: SavedView[];
}) {
  const { get, setParams, navigate } = useListParams();
  const q = get("q") ?? "";
  const industry = get("industry") ?? "";
  const owner = get("owner") ?? "";
  const showDeleted = get("deleted") === "1";

  const sorting = sortingFromParam(get("sort"));
  const columnVisibility = visibilityFromParam(get("hidden"));

  const [searchValue, setSearchValue] = useState(q);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedCompany | null>(null);
  const [, startTransition] = useTransition();

  const ownerById = useMemo(
    () => new Map(owners.map((o) => [o.id, o.label])),
    [owners],
  );

  const columns = useMemo<ColumnDef<SerializedCompany>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => row.name,
        cell: (ctx) => (
          <span className="text-fg truncate font-medium">
            {ctx.row.original.name}
          </span>
        ),
        meta: {
          // `locked` keeps the identity column out of the visibility menu —
          // a grid whose name column can be hidden is a grid of anonymous
          // rows.
          locked: true,
          edit: { kind: "text", value: (row) => row.name },
        },
      },
      {
        id: "domain",
        header: "Domain",
        accessorFn: (row) => row.domain ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted truncate">
            {ctx.row.original.domain ?? "—"}
          </span>
        ),
        meta: { edit: { kind: "text", value: (row) => row.domain ?? "" } },
      },
      {
        id: "industry",
        header: "Industry",
        accessorFn: (row) => row.industry ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted truncate">
            {ctx.row.original.industry ?? "—"}
          </span>
        ),
        meta: { edit: { kind: "text", value: (row) => row.industry ?? "" } },
      },
      {
        id: "owner",
        header: "Owner",
        // Owner is a Membership id resolved against this workspace's member
        // list, so it is a picker rather than free text — not inline-editable
        // here; the edit Sheet owns it.
        enableSorting: false,
        accessorFn: (row) => row.ownerId ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted truncate">
            {ctx.row.original.ownerId
              ? (ownerById.get(ctx.row.original.ownerId) ?? "—")
              : "—"}
          </span>
        ),
      },
      {
        id: "employees",
        header: "Employees",
        accessorFn: (row) => row.employees ?? 0,
        cell: (ctx) => (
          <span className="font-mono">{ctx.row.original.employees ?? "—"}</span>
        ),
        meta: {
          align: "right",
          edit: {
            kind: "number",
            value: (row) => row.employees?.toString() ?? "",
          },
        },
      },
      {
        id: "annualRevenue",
        header: "Annual revenue",
        accessorFn: (row) => row.annualRevenue ?? "",
        cell: (ctx) => (
          <span className="font-mono">
            {ctx.row.original.annualRevenue
              ? formatCurrency(
                  decimalToMinorUnits(ctx.row.original.annualRevenue),
                )
              : "—"}
          </span>
        ),
        meta: {
          align: "right",
          edit: {
            kind: "number",
            // Collected in dollars, exactly like the Sheet's field; the
            // conversion to integer minor units happens in `commitCell`
            // below so the float never reaches storage (BUILD_SPEC §8).
            value: (row) => row.annualRevenue ?? "",
          },
        },
      },
    ],
    [ownerById],
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
  if (industry) {
    chips.push({
      id: "industry",
      label: "Industry",
      value: industry,
      onClear: () => setParams({ industry: null }),
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

  function handleDelete(company: SerializedCompany) {
    startTransition(async () => {
      const result = await softDeleteCompanyAction(workspaceSlug, company.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${company.name}".`);
    });
  }

  function handleRestore(company: SerializedCompany) {
    startTransition(async () => {
      const result = await restoreCompanyAction(workspaceSlug, company.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored "${company.name}".`);
    });
  }

  /**
   * One inline cell -> one partial update. Returns the error message rather
   * than throwing, per the grid's contract and BUILD_SPEC §8's action shape.
   */
  async function commitCell(
    company: SerializedCompany,
    columnId: string,
    raw: string,
  ): Promise<string | null> {
    const value = raw.trim();
    let input: Record<string, unknown>;

    switch (columnId) {
      case "name":
        if (value.length === 0) return "Name is required.";
        if (value === company.name) return null;
        input = { name: value };
        break;
      case "domain":
        if (value === (company.domain ?? "")) return null;
        input = { domain: value || null };
        break;
      case "industry":
        if (value === (company.industry ?? "")) return null;
        input = { industry: value || null };
        break;
      case "employees": {
        if (value === (company.employees?.toString() ?? "")) return null;
        if (value === "") {
          input = { employees: null };
          break;
        }
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0) {
          return "Employees must be a whole number.";
        }
        input = { employees: parsed };
        break;
      }
      case "annualRevenue": {
        if (value === (company.annualRevenue ?? "")) return null;
        if (value === "") {
          input = { annualRevenueCents: null };
          break;
        }
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return "Annual revenue must be a positive number.";
        }
        input = { annualRevenueCents: Math.round(parsed * 100) };
        break;
      }
      default:
        return null;
    }

    const result = await updateCompanyAction(workspaceSlug, company.id, input);
    if (!result.ok) {
      toast.error(result.error);
      return result.error;
    }
    return null;
  }

  function rowActions(company: SerializedCompany): GridAction[] {
    if (showDeleted) {
      return [
        {
          label: "Restore",
          icon: RotateCcw,
          onSelect: () => handleRestore(company),
        },
      ];
    }
    return [
      {
        label: "Edit details",
        icon: Pencil,
        onSelect: () => setEditing(company),
      },
      {
        label: "Delete",
        icon: Trash2,
        destructive: true,
        onSelect: () => handleDelete(company),
      },
    ];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New company
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
              placeholder="Search companies…"
              aria-label="Search companies"
              className="pl-9"
            />
          </div>
        </form>

        <Select
          value={industry || ALL}
          onValueChange={(v) => setParams({ industry: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All industries</SelectItem>
            {industries.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
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
          entity="company"
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
          icon={Building2}
          title={showDeleted ? "No deleted companies" : "No companies yet"}
          description={
            showDeleted
              ? "Companies you delete show up here until they're restored."
              : "Add your first company to start tracking who you work with."
          }
          action={
            showDeleted ? undefined : (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                New company
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataGrid
            label="Companies"
            rows={data.items}
            columns={columns}
            rowId={(row) => row.id}
            rowHref={(row) => `/${workspaceSlug}/companies/${row.id}`}
            rowLabel={(row) => row.name}
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
            // A soft-deleted row is a tombstone: restore it first, then edit.
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

      <CompanyFormSheet
        workspaceSlug={workspaceSlug}
        open={createOpen}
        onOpenChange={setCreateOpen}
        owners={owners}
        customFieldDefs={customFieldDefs}
      />
      <CompanyFormSheet
        workspaceSlug={workspaceSlug}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        owners={owners}
        customFieldDefs={customFieldDefs}
        company={editing ?? undefined}
      />
    </div>
  );
}
