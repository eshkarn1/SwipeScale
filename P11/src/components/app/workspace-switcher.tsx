"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";

export interface SwitcherWorkspace {
  id: string;
  name: string;
  slug: string;
}

/**
 * BUILD_SPEC §7 M1: "Workspace switcher." One user can hold a `Membership`
 * in more than one `Workspace` (the seed script creates exactly this), so
 * every authed page needs a way to move between them without going back
 * through `/login`.
 */
export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: SwitcherWorkspace;
  workspaces: SwitcherWorkspace[];
}) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          className="hover:bg-surface-raised focus-visible:outline-ring flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="max-w-40 truncate">{current.name}</span>
          <ChevronsUpDown className="text-fg-muted size-4" aria-hidden="true" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" className="min-w-56">
        <DropdownLabel>Workspaces</DropdownLabel>
        {workspaces.map((workspace) => (
          <DropdownItem key={workspace.id} asChild>
            <Link href={`/${workspace.slug}`}>
              <span className="flex-1 truncate">{workspace.name}</span>
              {workspace.id === current.id ? (
                <Check className="text-accent size-4" aria-hidden="true" />
              ) : null}
            </Link>
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/onboarding">
            <Plus className="size-4" aria-hidden="true" />
            New workspace
          </Link>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
