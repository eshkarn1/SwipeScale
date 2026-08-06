"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Settings } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";

/**
 * Primary in-app navigation. M1 shipped no nav beyond the workspace
 * switcher (there was nowhere to go yet); M2 adds the three record lists,
 * so this is the first page a signed-in user can actually reach them from
 * without typing a URL.
 */
export function PrimaryNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();

  const links = [
    { href: `/${workspaceSlug}/dashboard`, label: "Dashboard" },
    { href: `/${workspaceSlug}/companies`, label: "Companies" },
    { href: `/${workspaceSlug}/contacts`, label: "Contacts" },
    { href: `/${workspaceSlug}/deals`, label: "Deals" },
  ];

  return (
    <nav className="flex items-center gap-1" aria-label="Primary">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "min-h-11 rounded-md px-3 py-2 text-sm font-medium",
              "transition-[color,background-color] duration-150 motion-reduce:transition-none",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-accent-muted text-accent-text"
                : "text-fg-muted hover:bg-surface-raised hover:text-fg",
            )}
          >
            {link.label}
          </Link>
        );
      })}

      <Dropdown>
        <DropdownTrigger asChild>
          <button
            type="button"
            className="text-fg-muted hover:bg-surface-raised hover:text-fg focus-visible:outline-ring flex min-h-11 cursor-pointer items-center gap-1 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Settings className="size-4" aria-hidden="true" />
            Settings
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </DropdownTrigger>
        <DropdownContent align="start">
          <DropdownItem asChild>
            <Link href={`/${workspaceSlug}/settings/team`}>Team</Link>
          </DropdownItem>
          <DropdownItem asChild>
            <Link href={`/${workspaceSlug}/settings/fields`}>
              Custom fields
            </Link>
          </DropdownItem>
          <DropdownItem asChild>
            <Link href={`/${workspaceSlug}/settings/billing`}>Billing</Link>
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </nav>
  );
}
