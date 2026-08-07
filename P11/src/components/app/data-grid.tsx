"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSort,
  type RowData,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Columns3,
  MoreHorizontal,
  X,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";

import type { LucideIcon } from "lucide-react";

/**
 * The record grid. BUILD_SPEC §2 fixes TanStack Table v8 (headless) as the
 * table layer and §7 M2 asks for "column visibility, multi-sort, filter
 * chips, pagination (cursor-based), and inline editing on the grid".
 *
 * TanStack owns column definition, visibility state and sorting state; every
 * piece of markup below is ours, which is the entire reason §2 picked a
 * headless library.
 *
 * ── WHY SORTING AND VISIBILITY ARE CONTROLLED ─────────────────────────────
 * Both live in the caller's URL search params, not in this component.
 * Pagination is cursor-based and resolved on the server, so sorting has to
 * be `manualSorting` — a client-side sort of 25 rows would silently reorder
 * only the current page. Putting visibility there too means a `SavedView`
 * (DECISIONS §10.2 — a saved view is a snapshot of the query string)
 * captures which columns were showing, for free.
 *
 * ── THE KEYBOARD MODEL ────────────────────────────────────────────────────
 * BUILD_SPEC §7 M2's acceptance criterion is "a record can be created,
 * edited inline, deleted, and restored entirely by keyboard", so this is the
 * load-bearing part of the file, not a nicety.
 *
 * Implemented as the ARIA grid pattern: the whole table is ONE tab stop
 * (roving `tabindex`), and arrows move a virtual cursor between cells.
 * Row `-1` is the header row, so sorting is reachable by arrowing up out of
 * the data rather than tabbing backwards past it.
 *
 *   Arrows          move between cells, header row included
 *   Home / End      first / last column
 *   Ctrl+Home/End   first / last cell of the grid
 *   Enter or F2     begin editing an editable cell
 *   Enter           commit the edit and return focus to the cell
 *   Escape          cancel the edit, restore the previous value
 *   Tab             commit and leave the grid (native tab order)
 *
 * ── FOCUS ACROSS A RE-RENDER ──────────────────────────────────────────────
 * This is where a grid with inline editing normally breaks. Committing an
 * edit unmounts the `<input>` and mounts a `<button>` in its place, so focus
 * lands on `<body>`; and the server action that follows calls
 * `router.refresh()`, which replaces the row data underneath.
 *
 * `pendingFocus` is deliberately STATE, not a ref. A ref would be consumed
 * by the first effect after the commit, which fires long before the
 * refreshed rows arrive. As state it survives every intermediate render and
 * is only cleared once the target cell actually exists in the DOM — and it
 * addresses cells by POSITION (`row:col`), not by record id, so a row that
 * vanished (soft-deleted out of the default filter) leaves focus on whatever
 * now occupies that position instead of dropping it to the body.
 */

/** `date` binds a native `<input type="date">`, whose value is `YYYY-MM-DD`
 * — the format the deal action's Zod schema already accepts. */
export type EditKind = "text" | "number" | "date";

// TanStack's sanctioned extension point for per-column config it does not
// itself model. Declared here rather than in a shared .d.ts so the shape and
// the component that reads it cannot drift apart.
declare module "@tanstack/react-table" {
  // TS2428: a declaration merge must repeat the ORIGINAL type parameter
  // names exactly, so `TValue` cannot be renamed to `_TValue` to satisfy
  // `no-unused-vars` — only `TData` is referenced below. The directive has
  // to sit on its own line immediately above the interface; folded into the
  // prose above it, it would apply to a comment line and report itself as
  // unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Present => the cell is inline-editable. */
    edit?: {
      kind: EditKind;
      /** Current value, as the string the `<input>` should start from. */
      value: (row: TData) => string;
      /** Shown when the cell is empty, e.g. "Add a domain". */
      placeholder?: string;
    };
    align?: "left" | "right";
    /** Excluded from the column-visibility menu (identity + actions). */
    locked?: boolean;
  }
}

export interface GridAction {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  /** Renders the item as a link. Mutually exclusive with `onSelect`. */
  href?: string;
  onSelect?: () => void;
}

export interface DataGridProps<T> {
  /** Names the grid for assistive tech. Required — an anonymous grid is
   * announced as a bare table. */
  label: string;
  rows: T[];
  columns: ColumnDef<T>[];
  rowId: (row: T) => string;
  /** Used for the row's link and for every per-row accessible name. */
  rowHref: (row: T) => string;
  rowLabel: (row: T) => string;
  actions: (row: T) => GridAction[];

  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;

  /**
   * Persist one cell. Resolves to an error message, or `null` on success.
   * Returning the message rather than throwing keeps this aligned with the
   * `{ ok, error }` action contract in BUILD_SPEC §8.
   */
  onCommitCell: (
    row: T,
    columnId: string,
    value: string,
  ) => Promise<string | null>;
  /** Disables editing entirely, e.g. while showing the trash. */
  readOnly?: boolean;
}

interface CellRef {
  row: number;
  col: number;
}

const HEADER_ROW = -1;

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export function DataGrid<T>({
  label,
  rows,
  columns,
  rowId,
  rowHref,
  rowLabel,
  actions,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
  onCommitCell,
  readOnly = false,
}: DataGridProps<T>) {
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility },
    // Sorting and pagination are resolved on the server against a keyset
    // cursor; sorting client-side would reorder only the visible page.
    manualSorting: true,
    enableMultiSort: true,
    // Without this TanStack caps multi-sort at 1 for keyboard-driven events.
    maxMultiSortColCount: 3,
    isMultiSortEvent: (event) =>
      (event as { shiftKey?: boolean }).shiftKey === true,
    onSortingChange: (updater) => {
      onSortingChange(
        typeof updater === "function" ? updater(sorting) : updater,
      );
    },
    onColumnVisibilityChange: (updater) => {
      onColumnVisibilityChange(
        typeof updater === "function" ? updater(columnVisibility) : updater,
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => rowId(row),
  });

  const visibleColumns = table.getVisibleLeafColumns();
  // Leading "open record" cell, then the data columns, then the actions cell.
  const totalCols = visibleColumns.length + 2;
  const OPEN_COL = 0;
  const ACTIONS_COL = totalCols - 1;

  const gridRef = useRef<HTMLTableElement>(null);
  const [active, setActive] = useState<CellRef>({ row: 0, col: 1 });
  const [editing, setEditing] = useState<CellRef | null>(null);
  const [pendingFocus, setPendingFocus] = useState<CellRef | null>(null);
  const [status, setStatus] = useState("");

  const focusCell = useCallback((target: CellRef) => {
    setActive(target);
    setPendingFocus(target);
  }, []);

  // Re-asserts focus after any render that destroyed the focused node —
  // leaving edit mode, or `router.refresh()` swapping the row data. Clamped
  // rather than exact, so a deleted last row lands on the new last row
  // instead of nowhere. Retries on the next render while the target is
  // still missing, which is what makes it survive the async refresh.
  useEffect(() => {
    if (!pendingFocus) return;
    if (rows.length === 0) {
      setPendingFocus(null);
      return;
    }
    const row = Math.min(
      Math.max(pendingFocus.row, HEADER_ROW),
      rows.length - 1,
    );
    const col = Math.min(Math.max(pendingFocus.col, 0), totalCols - 1);
    const node = gridRef.current?.querySelector<HTMLElement>(
      `[data-grid-cell="${cellKey(row, col)}"]`,
    );
    if (!node) return;
    node.focus();
    setActive({ row, col });
    setPendingFocus(null);
  }, [pendingFocus, rows, totalCols]);

  function move(delta: { row?: number; col?: number }) {
    const row = Math.min(
      Math.max(active.row + (delta.row ?? 0), HEADER_ROW),
      rows.length - 1,
    );
    const col = Math.min(
      Math.max(active.col + (delta.col ?? 0), 0),
      totalCols - 1,
    );
    focusCell({ row, col });
  }

  function handleGridKeyDown(event: React.KeyboardEvent<HTMLTableElement>) {
    // While an input owns the caret, arrows and Enter belong to it. Its own
    // handler stops propagation, so reaching here means we are not editing.
    if (editing) return;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        move({ col: 1 });
        break;
      case "ArrowLeft":
        event.preventDefault();
        move({ col: -1 });
        break;
      case "ArrowDown":
        event.preventDefault();
        move({ row: 1 });
        break;
      case "ArrowUp":
        event.preventDefault();
        move({ row: -1 });
        break;
      case "Home":
        event.preventDefault();
        focusCell({ row: event.ctrlKey ? 0 : active.row, col: 0 });
        break;
      case "End":
        event.preventDefault();
        focusCell({
          row: event.ctrlKey ? rows.length - 1 : active.row,
          col: totalCols - 1,
        });
        break;
      default:
        break;
    }
  }

  const editableAt = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (readOnly) return null;
      const column = visibleColumns[colIndex - 1];
      const row = rows[rowIndex];
      if (!column || !row) return null;
      const edit = column.columnDef.meta?.edit;
      return edit ? { column, row, edit } : null;
    },
    [readOnly, visibleColumns, rows],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <ColumnVisibilityMenu table={table} />
      </div>

      <div className="border-border bg-surface overflow-x-auto rounded-lg border">
        <table
          ref={gridRef}
          role="grid"
          aria-label={label}
          aria-rowcount={rows.length + 1}
          onKeyDown={handleGridKeyDown}
          className="w-full border-collapse text-left text-sm"
        >
          <thead role="rowgroup">
            <tr
              role="row"
              className="border-border text-fg-muted border-b text-xs tracking-wide uppercase"
            >
              <th
                role="columnheader"
                scope="col"
                className="w-11 px-2 py-2"
                aria-label="Open record"
              />
              {table.getHeaderGroups()[0]?.headers.map((header, index) => {
                const colIndex = index + 1;
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    role="columnheader"
                    scope="col"
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : canSort
                            ? "none"
                            : undefined
                    }
                    className={cn(
                      "px-2 py-2 font-medium",
                      header.column.columnDef.meta?.align === "right" &&
                        "text-right",
                    )}
                  >
                    <HeaderCell
                      cellId={cellKey(HEADER_ROW, colIndex)}
                      tabIndex={
                        active.row === HEADER_ROW && active.col === colIndex
                          ? 0
                          : -1
                      }
                      canSort={canSort}
                      sorted={sorted}
                      sortIndex={header.column.getSortIndex()}
                      multiSorted={sorting.length > 1}
                      onFocus={() =>
                        setActive({ row: HEADER_ROW, col: colIndex })
                      }
                      onToggle={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </HeaderCell>
                  </th>
                );
              })}
              <th
                role="columnheader"
                scope="col"
                className="w-11 px-2 py-2"
                aria-label="Row actions"
              />
            </tr>
          </thead>

          <tbody role="rowgroup">
            {table.getRowModel().rows.map((tableRow, rowIndex) => {
              const record = tableRow.original;
              return (
                <tr
                  key={tableRow.id}
                  role="row"
                  aria-rowindex={rowIndex + 2}
                  className="border-border h-row border-b last:border-b-0"
                >
                  <td role="gridcell" className="px-2 py-1">
                    <Link
                      href={rowHref(record)}
                      data-grid-cell={cellKey(rowIndex, OPEN_COL)}
                      tabIndex={
                        active.row === rowIndex && active.col === OPEN_COL
                          ? 0
                          : -1
                      }
                      onFocus={() =>
                        setActive({ row: rowIndex, col: OPEN_COL })
                      }
                      aria-label={`Open ${rowLabel(record)}`}
                      className={cn(
                        "text-fg-muted hover:bg-accent-muted hover:text-accent-text",
                        "inline-flex size-11 cursor-pointer items-center justify-center rounded-md",
                        "transition-[color,background-color] duration-150 motion-reduce:transition-none",
                        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
                      )}
                    >
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </td>

                  {tableRow.getVisibleCells().map((cell, index) => {
                    const colIndex = index + 1;
                    const meta = cell.column.columnDef.meta;
                    const isEditing =
                      editing?.row === rowIndex && editing.col === colIndex;
                    const editable = editableAt(rowIndex, colIndex);

                    return (
                      <td
                        key={cell.id}
                        role="gridcell"
                        aria-readonly={editable ? undefined : true}
                        className={cn(
                          "px-2 py-1",
                          meta?.align === "right" && "text-right",
                        )}
                      >
                        {isEditing && editable ? (
                          <EditableInput
                            initial={editable.edit.value(editable.row)}
                            kind={editable.edit.kind}
                            label={`${String(
                              cell.column.columnDef.header,
                            )} for ${rowLabel(record)}`}
                            onCancel={() => {
                              setEditing(null);
                              setStatus("Edit cancelled.");
                              focusCell({ row: rowIndex, col: colIndex });
                            }}
                            onCommit={async (value) => {
                              setEditing(null);
                              // Queued before awaiting: the input is already
                              // unmounting, and the refresh that follows can
                              // land several renders later.
                              focusCell({ row: rowIndex, col: colIndex });
                              const error = await onCommitCell(
                                record,
                                cell.column.id,
                                value,
                              );
                              setStatus(
                                error ?? `${rowLabel(record)} updated.`,
                              );
                              focusCell({ row: rowIndex, col: colIndex });
                            }}
                          />
                        ) : (
                          <CellButton
                            cellId={cellKey(rowIndex, colIndex)}
                            tabIndex={
                              active.row === rowIndex && active.col === colIndex
                                ? 0
                                : -1
                            }
                            editable={Boolean(editable)}
                            align={meta?.align}
                            label={`${String(
                              cell.column.columnDef.header,
                            )} for ${rowLabel(record)}`}
                            onFocus={() =>
                              setActive({ row: rowIndex, col: colIndex })
                            }
                            onActivate={() => {
                              if (!editable) return;
                              setEditing({ row: rowIndex, col: colIndex });
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </CellButton>
                        )}
                      </td>
                    );
                  })}

                  <td role="gridcell" className="px-2 py-1 text-right">
                    <RowActions
                      cellId={cellKey(rowIndex, ACTIONS_COL)}
                      tabIndex={
                        active.row === rowIndex && active.col === ACTIONS_COL
                          ? 0
                          : -1
                      }
                      onFocus={() =>
                        setActive({ row: rowIndex, col: ACTIONS_COL })
                      }
                      label={rowLabel(record)}
                      items={actions(record)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Commits and cancels are otherwise silent for a screen-reader user —
          the value simply changes somewhere off-focus. */}
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}

function HeaderCell({
  cellId,
  tabIndex,
  canSort,
  sorted,
  sortIndex,
  multiSorted,
  onFocus,
  onToggle,
  children,
}: {
  cellId: string;
  tabIndex: number;
  canSort: boolean;
  sorted: false | "asc" | "desc";
  sortIndex: number;
  multiSorted: boolean;
  onFocus: () => void;
  onToggle: ((event: unknown) => void) | undefined;
  children: React.ReactNode;
}) {
  // `uppercase` is repeated on both branches rather than inherited from the
  // header row. `text-transform` is an inherited property, but browsers do
  // not inherit it into form controls and Tailwind's Preflight resets a
  // button's font WITHOUT restoring it — so a `uppercase` class on the <tr>
  // styles this <span> and silently skips the <button>. Measured: th
  // computes `uppercase`, the button inside computes `none`. The visible
  // symptom is one odd-looking column header, which reads as a typo rather
  // than a CSS inheritance rule.
  if (!canSort) {
    return (
      <span
        data-grid-cell={cellId}
        tabIndex={tabIndex}
        onFocus={onFocus}
        className="focus-visible:outline-ring inline-flex min-h-11 items-center uppercase focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      data-grid-cell={cellId}
      tabIndex={tabIndex}
      onFocus={onFocus}
      // Shift+Enter on a focused button produces a click event carrying
      // shiftKey, which is exactly what TanStack's default
      // `isMultiSortEvent` reads — so additive sort works from the keyboard
      // without a second code path.
      onClick={onToggle}
      title="Sort. Hold Shift to add a second sort column."
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-1",
        // See the comment on the non-sortable branch above: a button does not
        // inherit `text-transform` from the header row.
        "uppercase",
        "hover:text-fg transition-[color,background-color] duration-150 motion-reduce:transition-none",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
        sorted && "text-accent-text",
      )}
    >
      {children}
      {sorted ? (
        <span aria-hidden="true" className="font-mono">
          {sorted === "asc" ? "↑" : "↓"}
          {multiSorted ? sortIndex + 1 : ""}
        </span>
      ) : (
        <ChevronDown
          className="size-3 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function CellButton({
  cellId,
  tabIndex,
  editable,
  align,
  label,
  onFocus,
  onActivate,
  children,
}: {
  cellId: string;
  tabIndex: number;
  editable: boolean;
  align?: "left" | "right";
  label: string;
  onFocus: () => void;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-grid-cell={cellId}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={onActivate}
      onKeyDown={(event) => {
        // F2 is the grid convention for "edit this cell"; Enter is what
        // everyone actually presses. Both, and neither may bubble to the
        // grid's arrow handler.
        if (event.key === "Enter" || event.key === "F2") {
          event.preventDefault();
          event.stopPropagation();
          onActivate();
        }
      }}
      aria-label={editable ? `Edit ${label}` : label}
      aria-readonly={editable ? undefined : true}
      className={cn(
        "flex min-h-11 w-full items-center rounded-md px-2 text-left",
        "transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
        align === "right" && "justify-end text-right",
        editable ? "hover:bg-accent-muted cursor-pointer" : "cursor-default",
      )}
    >
      {children}
    </button>
  );
}

function EditableInput({
  initial,
  kind,
  label,
  onCommit,
  onCancel,
}: {
  initial: string;
  kind: EditKind;
  label: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <input
      // Autofocus is correct here specifically: the input exists only
      // because the user just pressed Enter on this cell.
      autoFocus
      aria-label={label}
      type={kind === "text" ? "text" : kind}
      inputMode={kind === "number" ? "decimal" : undefined}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        // Everything the caret owns must stop here, or the grid's handler
        // moves the cell cursor while the user is editing text.
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      // Clicking away is a commit, matching every spreadsheet. Tab lands
      // here too, which is why Tab needs no special case above.
      onBlur={() => onCommit(value)}
      className={cn(
        "min-h-11 w-full rounded-md px-2 text-sm",
        "bg-surface-raised text-fg border-border-strong border",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
      )}
    />
  );
}

function RowActions({
  cellId,
  tabIndex,
  onFocus,
  label,
  items,
}: {
  cellId: string;
  tabIndex: number;
  onFocus: () => void;
  label: string;
  items: GridAction[];
}) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          data-grid-cell={cellId}
          tabIndex={tabIndex}
          onFocus={onFocus}
          aria-label={`Actions for ${label}`}
          className={cn(
            "text-fg-muted hover:bg-accent-muted hover:text-fg",
            "inline-flex size-11 cursor-pointer items-center justify-center rounded-md",
            "transition-[color,background-color] duration-150 motion-reduce:transition-none",
            "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
          )}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="end">
        {items.map((item) =>
          item.href ? (
            <DropdownItem key={item.label} asChild>
              <Link href={item.href}>
                {item.icon ? (
                  <item.icon className="size-4" aria-hidden="true" />
                ) : null}
                {item.label}
              </Link>
            </DropdownItem>
          ) : (
            <DropdownItem
              key={item.label}
              destructive={item.destructive}
              onSelect={item.onSelect}
            >
              {item.icon ? (
                <item.icon className="size-4" aria-hidden="true" />
              ) : null}
              {item.label}
            </DropdownItem>
          ),
        )}
      </DropdownContent>
    </Dropdown>
  );
}

/**
 * Column visibility (§7 M2). Reads TanStack's own column list so a new
 * column appears here automatically; `meta.locked` opts out the identity and
 * actions columns, which have nothing to toggle.
 */
function ColumnVisibilityMenu<T>({
  table,
}: {
  table: ReturnType<typeof useReactTable<T>>;
}) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => !column.columnDef.meta?.locked);
  const hiddenCount = columns.filter((column) => !column.getIsVisible()).length;

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="size-4" aria-hidden="true" />
          Columns
          {hiddenCount > 0 ? (
            <span className="text-fg-muted font-mono text-xs">
              {columns.length - hiddenCount}/{columns.length}
            </span>
          ) : null}
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end">
        {columns.map((column) => {
          const visible = column.getIsVisible();
          return (
            <DropdownItem
              key={column.id}
              // Radix closes the menu on select by default, which makes
              // toggling three columns three round trips through the trigger.
              onSelect={(event) => {
                event.preventDefault();
                column.toggleVisibility(!visible);
              }}
            >
              <span
                aria-hidden="true"
                className="inline-flex size-4 items-center justify-center"
              >
                {visible ? <Check className="size-4" /> : null}
              </span>
              {String(column.columnDef.header)}
              <span className="sr-only">
                {visible ? " (shown)" : " (hidden)"}
              </span>
            </DropdownItem>
          );
        })}
      </DropdownContent>
    </Dropdown>
  );
}

/** One active filter, as a dismissible chip (§7 M2 "filter chips"). */
export interface FilterChip {
  id: string;
  label: string;
  value: string;
  onClear: () => void;
}

export function FilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null;

  return (
    <ul
      className="flex flex-wrap items-center gap-2"
      aria-label="Active filters"
    >
      {chips.map((chip) => (
        <li key={chip.id}>
          <span className="border-border bg-surface-raised inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-xs">
            <span className="text-fg-muted tracking-wide uppercase">
              {chip.label}
            </span>
            <span className="text-fg font-medium">{chip.value}</span>
            <button
              type="button"
              onClick={chip.onClear}
              aria-label={`Clear ${chip.label} filter`}
              className={cn(
                "text-fg-muted hover:text-fg -mr-1 inline-flex size-11 cursor-pointer items-center justify-center rounded-md",
                "transition-[color,background-color] duration-150 motion-reduce:transition-none",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
              )}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Re-exported so list pages import their table types from one place. */
export type { ColumnDef, ColumnSort, SortingState, VisibilityState };
