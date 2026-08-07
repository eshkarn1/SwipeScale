"use client";

import { Button } from "@/components/ui/button";

/**
 * Cursor pager shared by the three M2 record lists (BUILD_SPEC §7 M2,
 * "pagination (cursor-based)").
 *
 * There is deliberately no page number and no "of N pages": a keyset cursor
 * does not know its own ordinal, and inventing one would need the `OFFSET`
 * query the cursor exists to avoid. The total row count is still shown —
 * `COUNT` was never the slow part.
 *
 * `null` for either cursor means that end has been reached, so the buttons
 * read their disabled state straight off the data rather than off a
 * comparison the caller has to get right.
 */
export function PaginationBar({
  total,
  shown,
  prevCursor,
  nextCursor,
  onNavigate,
}: {
  total: number;
  shown: number;
  prevCursor: string | null;
  nextCursor: string | null;
  /** `null` returns to the first page. */
  onNavigate: (cursor: { before?: string; after?: string } | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3">
      <p className="text-fg-muted text-xs" aria-live="polite">
        Showing {shown} of {total} {total === 1 ? "result" : "results"}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={prevCursor === null}
          onClick={() => onNavigate(prevCursor ? { before: prevCursor } : null)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={nextCursor === null}
          onClick={() => onNavigate(nextCursor ? { after: nextCursor } : null)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
