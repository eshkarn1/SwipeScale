/**
 * Shared page-based pagination for the M2 record lists (companies, contacts,
 * deals). BUILD_SPEC §7 M2 asks for cursor pagination; scoped down to
 * offset/page for this milestone — see DECISIONS §10 for why. Kept in one
 * place so all three list services agree on page size and clamp the same
 * way against a bad client-supplied page number.
 */
export const PAGE_SIZE = 25;

export interface PageInput {
  /** 1-based. Clamped to >= 1 — never trust a client-supplied page number
   * to be positive. */
  page?: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function clampPage(page: number | undefined): number {
  if (!page || !Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function toPageResult<T>(
  items: T[],
  total: number,
  page: number,
): PageResult<T> {
  return {
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
