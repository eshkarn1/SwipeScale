"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import type { SortingState, VisibilityState } from "@tanstack/react-table";

/**
 * URL search params are the single source of truth for a record list's
 * search/filter/sort/column/cursor state (BUILD_SPEC M2: "so views are
 * shareable" — the same reasoning M5's dashboard filter bar uses). A
 * `SavedView` is nothing more than a named snapshot of these same params
 * (see `server/services/saved-view.ts`), so keeping everything here rather
 * than in component state is what makes saving/loading a view a URL
 * navigation instead of a second state system to keep in sync.
 *
 * It also means TanStack Table's sorting and column-visibility state — which
 * would otherwise be component state — get captured by a saved view for
 * free, which is the whole payoff of DECISIONS §10.2's "the query string IS
 * the view" choice.
 *
 * ── PARAM VOCABULARY ──────────────────────────────────────────────────────
 *   sort    `name:asc,employees:desc`  multi-sort, in precedence order
 *   hidden  `domain,industry`          columns toggled OFF (so the default
 *                                      set is the empty param, not a list
 *                                      that has to be kept in sync)
 *   after / before                     opaque keyset cursors
 *
 * Changing any filter, search or sort clears both cursors. A cursor is cut
 * against a specific ordering and set of rows; carrying it across a change
 * would land the user in the middle of a list they can no longer navigate
 * back out of. (`decodeCursor` also rejects a cursor whose sort signature no
 * longer matches, so this is belt and braces — but the URL should not carry
 * dead state either way.)
 */

const CURSOR_PARAMS = ["after", "before"] as const;

export function useListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams],
  );

  const push = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router],
  );

  const setParams = useCallback(
    (
      updates: Record<string, string | null>,
      options: { resetCursor?: boolean } = {},
    ) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (options.resetCursor !== false) {
        for (const key of CURSOR_PARAMS) next.delete(key);
      }
      push(next);
    },
    [push, searchParams],
  );

  /** Moves to the next/previous page, or back to the first (`null`). */
  const navigate = useCallback(
    (cursor: { before?: string; after?: string } | null) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const key of CURSOR_PARAMS) next.delete(key);
      if (cursor?.after) next.set("after", cursor.after);
      if (cursor?.before) next.set("before", cursor.before);
      push(next);
    },
    [push, searchParams],
  );

  const applyAll = useCallback(
    (params: Record<string, string>) => {
      const next = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value) next.set(key, value);
      }
      push(next);
    },
    [push],
  );

  return { get, setParams, navigate, applyAll, searchParams };
}

// ── TanStack Table state <-> URL ──────────────────────────────────────────

/** `?sort=name:asc,employees:desc` -> TanStack `SortingState`. */
export function sortingFromParam(raw: string | undefined): SortingState {
  if (!raw) return [];
  const state: SortingState = [];
  for (const part of raw.split(",")) {
    const [id, dir] = part.split(":");
    if (!id) continue;
    state.push({ id, desc: dir === "desc" });
  }
  return state;
}

/** TanStack `SortingState` -> `?sort=`. Empty state clears the param, so the
 * service falls back to its own default sort. */
export function sortingToParam(sorting: SortingState): string | null {
  if (sorting.length === 0) return null;
  return sorting.map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`).join(",");
}

/**
 * `?hidden=domain,industry` -> TanStack `VisibilityState`.
 *
 * Only the hidden columns are listed. Storing the *shown* set instead would
 * mean every new column defaults to hidden for anyone holding an old URL or
 * saved view — the wrong failure direction.
 */
export function visibilityFromParam(raw: string | undefined): VisibilityState {
  if (!raw) return {};
  const state: VisibilityState = {};
  for (const id of raw.split(",")) {
    if (id) state[id] = false;
  }
  return state;
}

export function visibilityToParam(visibility: VisibilityState): string | null {
  const hidden = Object.entries(visibility)
    .filter(([, visible]) => visible === false)
    .map(([id]) => id);
  return hidden.length > 0 ? hidden.join(",") : null;
}
