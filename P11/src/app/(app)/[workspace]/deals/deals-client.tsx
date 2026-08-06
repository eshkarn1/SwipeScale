"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Handshake,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
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
import { decimalToMinorUnits, formatCurrency } from "@/lib/money";
import { PaginationBar } from "@/components/app/pagination-bar";
import { SavedViewMenu } from "@/components/app/saved-view-menu";
import { useListParams } from "@/components/app/use-list-params";
import { restoreDealAction, softDeleteDealAction } from "@/server/actions/deal";

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
import type { PageResult } from "@/lib/pagination";

const ALL = "__all__";

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
  data: PageResult<SerializedDealWithRelations>;
  stages: Stage[];
  owners: OwnerOption[];
  companies: CompanyOption[];
  contactOptions: ContactOption[];
  sides: WorkspaceOptionChoice[];
  contactRoles: WorkspaceOptionChoice[];
  customFieldDefs: CustomFieldDef[];
  savedViews: SavedView[];
}) {
  const { get, setParams, setPage } = useListParams();
  const q = get("q") ?? "";
  const stageId = get("stageId") ?? "";
  const side = get("side") ?? "";
  const showDeleted = get("deleted") === "1";
  const sort = get("sort") ?? "createdAt";
  const dir = get("dir") ?? "desc";

  const [searchValue, setSearchValue] = useState(q);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedDealWithRelations | null>(
    null,
  );
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

  const sideLabel = (value: string) =>
    sides.find((s) => s.value === value)?.label ?? value;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Deals</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New deal
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
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border bg-surface text-fg-muted border-b text-xs tracking-wide uppercase">
                  <SortableHeader
                    label="Title"
                    field="title"
                    sort={sort}
                    dir={dir}
                    onSort={toggleSort}
                  />
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  {sides.length > 0 ? (
                    <th className="px-4 py-3 font-medium">Side</th>
                  ) : null}
                  <SortableHeader
                    label="Amount"
                    field="amount"
                    sort={sort}
                    dir={dir}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Expected close"
                    field="expectedCloseDate"
                    sort={sort}
                    dir={dir}
                    onSort={toggleSort}
                  />
                  <th className="w-11 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-border h-row border-b last:border-b-0"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/${workspaceSlug}/deals/${deal.id}`}
                        className="text-fg hover:text-accent-text font-medium"
                      >
                        {deal.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
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
                    </td>
                    <td className="text-fg-muted px-4 py-2">
                      {deal.company ? (
                        <Link
                          href={`/${workspaceSlug}/companies/${deal.company.id}`}
                          className="hover:text-fg"
                        >
                          {deal.company.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    {sides.length > 0 ? (
                      <td className="text-fg-muted px-4 py-2">
                        {deal.side ? sideLabel(deal.side) : "—"}
                      </td>
                    ) : null}
                    <td className="px-4 py-2 font-mono">
                      {formatCurrency(decimalToMinorUnits(deal.amount))}
                    </td>
                    <td className="text-fg-muted px-4 py-2 font-mono">
                      {deal.expectedCloseDate
                        ? new Date(deal.expectedCloseDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${deal.title}`}
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
                              onSelect={() => handleRestore(deal)}
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
                              <DropdownItem onSelect={() => setEditing(deal)}>
                                Edit
                              </DropdownItem>
                              <DropdownItem
                                destructive
                                onSelect={() => handleDelete(deal)}
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
