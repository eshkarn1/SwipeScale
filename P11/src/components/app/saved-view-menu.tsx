"use client";

import { useState, useTransition } from "react";
import { Bookmark, ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  createSavedViewAction,
  deleteSavedViewAction,
} from "@/server/actions/saved-view";
import { useListParams } from "@/components/app/use-list-params";

import type { SavedView } from "@/generated/prisma/client";
import type { CustomFieldEntity } from "@/server/services/custom-field-def";

/**
 * Views dropdown shared by every M2 record list. A saved view is a name for
 * the exact set of URL params the list is currently showing — see
 * `use-list-params.ts` — so "load" is a navigation and "save" is
 * `URLSearchParams` serialised into `SavedView.filters`, never a second
 * source of truth the list has to reconcile against.
 */
export function SavedViewMenu({
  workspaceSlug,
  entity,
  views,
}: {
  workspaceSlug: string;
  entity: CustomFieldEntity;
  views: SavedView[];
}) {
  const { searchParams, applyAll } = useListParams();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentView = searchParams.get("view");

  function loadView(view: SavedView) {
    const filters =
      typeof view.filters === "object" && view.filters !== null
        ? (view.filters as Record<string, unknown>)
        : {};
    const params: Record<string, string> = { view: view.id };
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === "string") params[key] = value;
    }
    applyAll(params);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // `after`/`before` are keyset cursors — transient position within a
    // list, not part of what the view IS. Saving one would drop everyone who
    // loads the view into page four of someone else's browsing session.
    // `view` is excluded for the same reason it always was: it names the row
    // being written, not the query.
    const TRANSIENT = new Set(["after", "before", "view"]);
    const filters: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (TRANSIENT.has(key)) continue;
      filters[key] = value;
    }

    startTransition(async () => {
      const result = await createSavedViewAction(workspaceSlug, {
        entity,
        name,
        filters,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Saved view "${name}".`);
      setSaveOpen(false);
      setName("");
    });
  }

  function handleDelete(view: SavedView) {
    startTransition(async () => {
      const result = await deleteSavedViewAction(
        workspaceSlug,
        view.id,
        entity,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted view "${view.name}".`);
    });
  }

  return (
    <>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="outline" size="sm">
            <Bookmark className="size-4" aria-hidden="true" />
            {views.find((v) => v.id === currentView)?.name ?? "Views"}
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>
        </DropdownTrigger>
        <DropdownContent align="start" className="min-w-56">
          <DropdownLabel>Saved views</DropdownLabel>
          {views.length === 0 ? (
            <p className="text-fg-muted px-3 py-2 text-xs">
              No saved views yet.
            </p>
          ) : (
            views.map((view) => (
              <DropdownItem
                key={view.id}
                onSelect={() => loadView(view)}
                className="justify-between"
              >
                <span className="flex-1 truncate">{view.name}</span>
                <button
                  type="button"
                  aria-label={`Delete view "${view.name}"`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(view);
                  }}
                  className="text-fg-muted hover:text-danger cursor-pointer"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </DropdownItem>
            ))
          )}
          <DropdownSeparator />
          <DropdownItem onSelect={() => setSaveOpen(true)}>
            Save current view…
          </DropdownItem>
        </DropdownContent>
      </Dropdown>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <form
            onSubmit={handleSave}
            className="flex flex-col gap-4"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Save current view</DialogTitle>
            </DialogHeader>
            <Field label="Name" error={error ?? undefined}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  invalid={Boolean(error)}
                  required
                  autoFocus
                />
              )}
            </Field>
            <DialogFooter>
              <Button type="submit" loading={isPending}>
                Save view
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
