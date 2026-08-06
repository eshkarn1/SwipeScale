"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Building2,
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
import {
  restoreCompanyAction,
  softDeleteCompanyAction,
} from "@/server/actions/company";
import type { SerializedCompany } from "@/lib/serialize";

import { CompanyFormSheet, type OwnerOption } from "./company-form";

import type { CustomFieldDef, SavedView } from "@/generated/prisma/client";
import type { PageResult } from "@/lib/pagination";

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
  data: PageResult<SerializedCompany>;
  industries: string[];
  owners: OwnerOption[];
  customFieldDefs: CustomFieldDef[];
  savedViews: SavedView[];
}) {
  const { get, setParams, setPage } = useListParams();
  const q = get("q") ?? "";
  const industry = get("industry") ?? "";
  const showDeleted = get("deleted") === "1";
  const sort = get("sort") ?? "name";
  const dir = get("dir") ?? "asc";

  const [searchValue, setSearchValue] = useState(q);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedCompany | null>(null);
  const [isPending, startTransition] = useTransition();
  const ownerById = new Map(owners.map((o) => [o.id, o.label]));

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New company
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
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border bg-surface text-fg-muted border-b text-xs tracking-wide uppercase">
                  <SortableHeader
                    label="Name"
                    field="name"
                    sort={sort}
                    dir={dir}
                    onSort={toggleSort}
                  />
                  <th className="px-4 py-3 font-medium">Industry</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <SortableHeader
                    label="Employees"
                    field="employees"
                    sort={sort}
                    dir={dir}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Annual revenue"
                    field="annualRevenue"
                    sort={sort}
                    dir={dir}
                    onSort={toggleSort}
                  />
                  <th className="w-11 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((company) => (
                  <tr
                    key={company.id}
                    className="border-border h-row border-b last:border-b-0"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/${workspaceSlug}/companies/${company.id}`}
                        className="text-fg hover:text-accent-text font-medium"
                      >
                        {company.name}
                      </Link>
                      {company.domain ? (
                        <span className="text-fg-muted ml-2 text-xs">
                          {company.domain}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-fg-muted px-4 py-2">
                      {company.industry ?? "—"}
                    </td>
                    <td className="text-fg-muted px-4 py-2">
                      {company.ownerId
                        ? (ownerById.get(company.ownerId) ?? "—")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {company.employees ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {company.annualRevenue
                        ? formatCurrency(
                            decimalToMinorUnits(company.annualRevenue),
                          )
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${company.name}`}
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
                              onSelect={() => handleRestore(company)}
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
                                onSelect={() => setEditing(company)}
                              >
                                Edit
                              </DropdownItem>
                              <DropdownItem
                                destructive
                                onSelect={() => handleDelete(company)}
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
