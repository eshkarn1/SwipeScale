"use client";

import { Button } from "@/components/ui/button";

/** Prev/Next pager shared by the three M2 record lists. Page-based rather
 * than cursor-based — see DECISIONS §10 for the scope tradeoff. */
export function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-fg-muted text-xs">
        {total} {total === 1 ? "result" : "results"} · page {page} of{" "}
        {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
