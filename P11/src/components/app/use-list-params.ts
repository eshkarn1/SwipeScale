"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * URL search params are the single source of truth for a record list's
 * search/filter/sort/page state (BUILD_SPEC M2: "so views are shareable" —
 * the same reasoning M5's dashboard filter bar uses). A `SavedView` is
 * nothing more than a named snapshot of these same params (see
 * `server/services/saved-view.ts`), so keeping everything here rather than
 * in component state is what makes saving/loading a view a URL navigation
 * instead of a second state system to keep in sync.
 *
 * Changing any filter/search/sort resets `page` to 1 — a stale page number
 * against a new filter would silently show "no results" past the end.
 */
export function useListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams],
  );

  const setParams = useCallback(
    (
      updates: Record<string, string | null>,
      options: { resetPage?: boolean } = {},
    ) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (options.resetPage !== false) {
        next.delete("page");
      }
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      const next = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        next.delete("page");
      } else {
        next.set("page", String(page));
      }
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const applyAll = useCallback(
    (params: Record<string, string>) => {
      const next = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value) next.set(key, value);
      }
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router],
  );

  return { get, setParams, setPage, applyAll, searchParams };
}
