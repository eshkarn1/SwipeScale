"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Handshake,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  restoreDealAction,
  softDeleteDealAction,
  updateDealAction,
} from "@/server/actions/deal";

import {
  DealFormSheet,
  type CompanyOption,
  type ContactOption,
  type OwnerOption,
  type WorkspaceOptionChoice,
} from "./deal-form";

import type { SerializedDealWithRelations } from "@/lib/serialize";
import type {
  CustomFieldDef,
  SavedView,
  Stage,
} from "@/generated/prisma/client";
import type { CursorPage } from "@/lib/pagination";

const ALL = "__all__";

/** `Date` -> the `YYYY-MM-DD` a native date input round-trips. Deliberately
 * UTC: BUILD_SPEC §8 stores every timestamp UTC, and a local-timezone
 * conversion here would show (and then save) the previous day west of
 * Greenwich. */
function toDateInputValue(value: Date | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

/** Resolves a stored `WorkspaceOption.value` to the workspace's own label
 * (DECISIONS §8.6 — a workspace can rename or archive an option without a
 * data migration, so the raw value is never shown). Hoisted out of the
 * component so it is a stable module-level function rather than a new
 * closure every render, which would otherwise have to be a `useMemo`
 * dependency. */
function resolveOptionLabel(
  options: WorkspaceOptionChoice[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function DealsClient({
  workspaceSlug,
  data,
  stages,
  owners,
  companies,
  contactOptions,
  sides,
  contactRoles,
  customFieldDefs,
  savedViews,
}: {
  workspaceSlug: string;
  data: CursorPage<SerializedDealWithRelations>;
  stages: Stage[];
  owners: OwnerOption[];
  companies: CompanyOption[];
  contactOptions: ContactOption[];
  sides: WorkspaceOptionChoice[];
  contactRoles: WorkspaceOptionChoice[];
  customFieldDefs: CustomFieldDef[];
  savedViews: SavedView[];
}) {
  const { get, setParams, navigate } = useListParams();
  const q = get("q") ?? "";
  const stageId = get("stageId") ?? "";
  const side = get("side") ?? "";
  const companyId = get("companyId") ?? "";
  const owner = get("owner") ?? "";
  const showDeleted = get("deleted") === "1";

  const sorting = sortingFromParam(get("sort"));
  const columnVisibility = visibilityFromParam(get("hidden"));

  const [searchValue, setSearchValue] = useState(q);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedDealWithRelations | null>(
    null,
  );
  const [, startTransition] = useTransition();

  const ownerById = useMemo(
    () => new Map(owners.map((o) => [o.id, o.label])),
    [owners],
  );
  const companyById = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );
  // Vocabulary comes from `WorkspaceOption` rows seeded by the workspace's
  // vertical preset (DECISIONS §8.6) — never a literal here, so a
  // `general_b2b` workspace shows its own words and a workspace with no
  // `deal_side` options shows no side column at all.
  const sideLabel = (value: string) => resolveOptionLabel(sides, value);

  const columns = useMemo<ColumnDef<SerializedDealWithRelations>[]>(() => {
    const defs: ColumnDef<SerializedDealWithRelations>[] = [
      {
        id: "title",
        header: "Title",
        accessorFn: (row) => row.title,
        cell: (ctx) => (
          <span className="text-fg truncate font-medium">
            {ctx.row.original.title}
          </span>
        ),
        meta: {
          locked: true,
          edit: { kind: "text", value: (row) => row.title },
        },
      },
      {
        id: "stage",
        header: "Stage",
        // Moving a deal between stages writes an append-only
        // `DealStageEvent` (BUILD_SPEC §4) — that is a pipeline action, not a
        // text edit, and it belongs to the M3 board and the edit Sheet.
        enableSorting: false,
        accessorFn: (row) => row.stage.name,
        cell: (ctx) => (
          <Badge
            variant={
              ctx.row.original.stage.type === "WON"
                ? "accent"
                : ctx.row.original.stage.type === "LOST"
                  ? "danger"
                  : "neutral"
            }
          >
            {ctx.row.original.stage.name}
          </Badge>
        ),
      },
      {
        id: "company",
        header: "Company",
        enableSorting: false,
        accessorFn: (row) => row.company?.name ?? "",
        cell: (ctx) => {
          const company = ctx.row.original.company;
          return company ? (
            <Link
              href={`/${workspaceSlug}/companies/${company.id}`}
              className="text-fg-muted hover:text-accent-text truncate"
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
        id: "amount",
        header: "Amount",
        accessorFn: (row) => row.amount,
        cell: (ctx) => (
          <span className="font-mono">
            {formatCurrency(
              decimalToMinorUnits(ctx.row.original.amount),
              ctx.row.original.currency,
            )}
          </span>
        ),
        meta: {
          align: "right",
          // Dollars in, integer minor units out — see `commitCell`.
          edit: { kind: "number", value: (row) => row.amount },
        },
      },
      {
        id: "expectedCloseDate",
        header: "Expected close",
        accessorFn: (row) => row.expectedCloseDate?.toString() ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted font-mono">
            {toDateInputValue(ctx.row.original.expectedCloseDate) || "—"}
          </span>
        ),
        meta: {
          edit: {
            kind: "date",
            value: (row) => toDateInputValue(row.expectedCloseDate),
          },
        },
      },
      {
        id: "source",
        header: "Source",
        accessorFn: (row) => row.source ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted truncate">
            {ctx.row.original.source ?? "—"}
          </span>
        ),
        meta: { edit: { kind: "text", value: (row) => row.source ?? "" } },
      },
      {
        id: "owner",
        header: "Owner",
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
    ];

    // Only workspaces whose vertical defines "which party do we represent"
    // get this column at all.
    if (sides.length > 0) {
      defs.push({
        id: "side",
        header: "Side",
        enableSorting: false,
        accessorFn: (row) => row.side ?? "",
        cell: (ctx) => (
          <span className="text-fg-muted truncate">
            {ctx.row.original.side
              ? resolveOptionLabel(sides, ctx.row.original.side)
              : "—"}
          </span>
        ),
      });
    }

    return defs;
  }, [workspaceSlug, ownerById, sides]);

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
  if (stageId) {
    chips.push({
      id: "stageId",
      label: "Stage",
      value: stages.find((s) => s.id === stageId)?.name ?? stageId,
      onClear: () => setParams({ stageId: null }),
    });
  }
  if (side) {
    chips.push({
      id: "side",
      label: "Side",
      value: sideLabel(side),
      onClear: () => setParams({ side: null }),
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

  function handleDelete(deal: SerializedDealWithRelations) {
    startTransition(async () => {
      const result = await softDeleteDealAction(workspaceSlug, deal.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted "${deal.title}".`);
    });
  }

  function handleRestore(deal: SerializedDealWithRelations) {
    startTransition(async () => {
      const result = await restoreDealAction(workspaceSlug, deal.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Restored "${deal.title}".`);
    });
  }

  async function commitCell(
    deal: SerializedDealWithRelations,
    columnId: string,
    raw: string,
  ): Promise<string | null> {
    const value = raw.trim();
    let input: Record<string, unknown>;

    switch (columnId) {
      case "title":
        if (value.length === 0) return "Title is required.";
        if (value === deal.title) return null;
        input = { title: value };
        break;
      case "amount": {
        if (value === deal.amount) return null;
        if (value === "") {
          input = { amountCents: null };
          break;
        }
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return "Amount must be a positive number.";
        }
        input = { amountCents: Math.round(parsed * 100) };
        break;
      }
      case "expectedCloseDate":
        if (value === toDateInputValue(deal.expectedCloseDate)) return null;
        input = { expectedCloseDate: value || null };
        break;
      case "source":
        if (value === (deal.source ?? "")) return null;
        input = { source: value || null };
        break;
      default:
        return null;
    }

    const result = await updateDealAction(workspaceSlug, deal.id, input);
    if (!result.ok) {
      toast.error(result.error);
      return result.error;
    }
    return null;
  }

  function rowActions(deal: SerializedDealWithRelations): GridAction[] {
    if (showDeleted) {
      return [
        {
          label: "Restore",
          icon: RotateCcw,
          onSelect: () => handleRestore(deal),
        },
      ];
    }
    return [
      { label: "Edit details", icon: Pencil, onSelect: () => setEditing(deal) },
      {
        label: "Delete",
        icon: Trash2,
        destructive: true,
        onSelect: () => handleDelete(deal),
      },
    ];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Deals</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New deal
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
              placeholder="Search deals…"
              aria-label="Search deals"
              className="pl-9"
            />
          </div>
        </form>

        <Select
          value={stageId || ALL}
          onValueChange={(v) => setParams({ stageId: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {sides.length > 0 ? (
          <Select
            value={side || ALL}
            onValueChange={(v) => setParams({ side: v === ALL ? null : v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sides</SelectItem>
              {sides.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

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
          entity="deal"
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
          icon={Handshake}
          title={showDeleted ? "No deleted deals" : "No deals yet"}
          description={
            showDeleted
              ? "Deals you delete show up here until they're restored."
              : "Add your first deal to start tracking the pipeline."
          }
          action={
            showDeleted ? undefined : (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                New deal
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataGrid
            label="Deals"
            rows={data.items}
            columns={columns}
            rowId={(row) => row.id}
            rowHref={(row) => `/${workspaceSlug}/deals/${row.id}`}
            rowLabel={(row) => row.title}
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

      <DealFormSheet
        workspaceSlug={workspaceSlug}
        open={createOpen}
        onOpenChange={setCreateOpen}
        stages={stages}
        owners={owners}
        companies={companies}
        contactOptions={contactOptions}
        sides={sides}
        contactRoles={contactRoles}
        customFieldDefs={customFieldDefs}
      />
      <DealFormSheet
        workspaceSlug={workspaceSlug}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        stages={stages}
        owners={owners}
        companies={companies}
        contactOptions={contactOptions}
        sides={sides}
        contactRoles={contactRoles}
        customFieldDefs={customFieldDefs}
        deal={editing ?? undefined}
      />
    </div>
  );
}
