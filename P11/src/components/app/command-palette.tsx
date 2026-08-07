"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  Handshake,
  LayoutDashboard,
  Search,
  Settings,
  Users,
} from "lucide-react";

import { cn } from "@/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchWorkspaceAction } from "@/server/actions/search";
// From `lib/`, never from `server/services/search` — that module imports
// Prisma and the `pg` driver, and pulling a *value* out of it drags both
// into the browser bundle. See src/lib/search.ts.
import { MIN_QUERY_LENGTH, type SearchHit } from "@/lib/search";

import type { LucideIcon } from "lucide-react";

/**
 * The global command palette (BUILD_SPEC §7 M2: "Global command palette
 * (⌘K) for search and navigation"). Mounted once by the workspace layout,
 * so it is reachable from every authenticated page.
 *
 * ── WHY IT IS HAND-BUILT ──────────────────────────────────────────────────
 * Radix supplies the Dialog — focus trap, Escape, scroll lock, returning
 * focus to whatever was focused before — and nothing else here. The list is
 * the ARIA **combobox + listbox** pattern written out: focus never leaves the
 * text input, and `aria-activedescendant` moves a virtual cursor through the
 * options. That is the correct pattern for a search field with results, and
 * it is why arrow keys can drive the list while the user is still typing.
 *
 * ── WHY THE RESULTS ARE A PROJECTION ──────────────────────────────────────
 * `searchWorkspace` returns four strings per hit, never a row. A `Deal`
 * carries `amount`, a Prisma `Decimal`, which cannot cross a Server Action's
 * return boundary and fails silently past tsc, eslint and next build — see
 * `src/lib/serialize.ts`. Projecting in the service means this component
 * cannot reintroduce that bug.
 */

interface PaletteItem {
  key: string;
  group: string;
  label: string;
  sublabel: string | null;
  href: string;
  icon: LucideIcon;
}

const HIT_ICONS: Record<SearchHit["type"], LucideIcon> = {
  company: Building2,
  contact: Users,
  deal: Handshake,
};

const HIT_GROUPS: Record<SearchHit["type"], string> = {
  company: "Companies",
  contact: "Contacts",
  deal: "Deals",
};

const HIT_PATHS: Record<SearchHit["type"], string> = {
  company: "companies",
  contact: "contacts",
  deal: "deals",
};

export function CommandPalette({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const listboxId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // ⌘K on macOS, Ctrl+K elsewhere. Registered on the window so it works
  // from anywhere on the page, including from inside the record grid.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Debounced search. The `cancelled` flag is what stops a slow early
  // response from overwriting a fast later one — without it, typing
  // "acme" can end up showing the results for "ac".
  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < MIN_QUERY_LENGTH) {
      setHits([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const result = await searchWorkspaceAction(workspaceSlug, { q: term });
      if (cancelled) return;
      setHits(result.ok ? result.data : []);
      setLoading(false);
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, workspaceSlug]);

  const navigationItems = useMemo<PaletteItem[]>(
    () => [
      {
        key: "nav-dashboard",
        group: "Go to",
        label: "Dashboard",
        sublabel: null,
        href: `/${workspaceSlug}/dashboard`,
        icon: LayoutDashboard,
      },
      {
        key: "nav-companies",
        group: "Go to",
        label: "Companies",
        sublabel: null,
        href: `/${workspaceSlug}/companies`,
        icon: Building2,
      },
      {
        key: "nav-contacts",
        group: "Go to",
        label: "Contacts",
        sublabel: null,
        href: `/${workspaceSlug}/contacts`,
        icon: Users,
      },
      {
        key: "nav-deals",
        group: "Go to",
        label: "Deals",
        sublabel: null,
        href: `/${workspaceSlug}/deals`,
        icon: Handshake,
      },
      {
        key: "nav-team",
        group: "Settings",
        label: "Team",
        sublabel: null,
        href: `/${workspaceSlug}/settings/team`,
        icon: Settings,
      },
      {
        key: "nav-fields",
        group: "Settings",
        label: "Custom fields",
        sublabel: null,
        href: `/${workspaceSlug}/settings/fields`,
        icon: Settings,
      },
      {
        key: "nav-billing",
        group: "Settings",
        label: "Billing",
        sublabel: null,
        href: `/${workspaceSlug}/settings/billing`,
        icon: Settings,
      },
    ],
    [workspaceSlug],
  );

  const items = useMemo<PaletteItem[]>(() => {
    const term = query.trim().toLowerCase();
    const navigation = term
      ? navigationItems.filter((item) =>
          item.label.toLowerCase().includes(term),
        )
      : navigationItems;

    const records = hits.map((hit): PaletteItem => ({
      key: `${hit.type}-${hit.id}`,
      group: HIT_GROUPS[hit.type],
      label: hit.label,
      sublabel: hit.sublabel,
      href: `/${workspaceSlug}/${HIT_PATHS[hit.type]}/${hit.id}`,
      icon: HIT_ICONS[hit.type],
    }));

    // Records first once there are any: having typed enough to match a
    // record, that is what the user is reaching for.
    return records.length > 0 ? [...records, ...navigation] : navigation;
  }, [hits, navigationItems, query, workspaceSlug]);

  // Any change to the result set invalidates the cursor position.
  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  // Keeps the virtual cursor inside the scroll viewport. `block: "nearest"`
  // so arrowing one step never jumps the list.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setActiveIndex(0);
  }, []);

  const select = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      close();
      router.push(item.href);
    },
    [close, router],
  );

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) =>
          items.length === 0 ? 0 : (prev + 1) % items.length,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) =>
          items.length === 0 ? 0 : (prev - 1 + items.length) % items.length,
        );
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(Math.max(0, items.length - 1));
        break;
      case "Enter":
        event.preventDefault();
        select(items[activeIndex]);
        break;
      default:
        break;
    }
  }

  let lastGroup: string | null = null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Named explicitly because the visible label collapses to the icon
        // alone on narrow viewports, where the header has no room for it.
        aria-label="Search"
        aria-keyshortcuts="Meta+K Control+K"
        className={cn(
          "text-fg-muted hover:bg-surface-raised hover:text-fg border-border-strong",
          "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm",
          "transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none",
          "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="border-border bg-surface text-fg-muted hidden rounded-sm border px-1.5 font-mono text-xs sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent
          showClose={false}
          className="top-[12vh] max-w-xl translate-y-0 gap-0 p-0"
          aria-label="Command palette"
        >
          <DialogTitle className="sr-only">Search and navigate</DialogTitle>
          <DialogDescription className="sr-only">
            Type to search companies, contacts and deals, or jump to a page. Use
            the arrow keys to move through results and Enter to open one.
          </DialogDescription>

          <div className="border-border flex items-center gap-3 border-b px-4">
            <Search
              className="text-fg-muted size-4 shrink-0"
              aria-hidden="true"
            />
            <input
              autoFocus
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={
                items.length > 0 ? `${listboxId}-${activeIndex}` : undefined
              }
              aria-autocomplete="list"
              aria-label="Search companies, contacts and deals"
              placeholder="Search or jump to…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              className="text-fg placeholder:text-fg-muted min-h-14 w-full bg-transparent text-sm outline-none"
            />
            {loading ? (
              <span className="text-fg-muted shrink-0 text-xs">Searching…</span>
            ) : null}
          </div>

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Results"
            className="max-h-80 overflow-y-auto p-2"
          >
            {items.length === 0 ? (
              <li className="text-fg-muted px-3 py-6 text-center text-sm">
                {query.trim().length < MIN_QUERY_LENGTH
                  ? "Keep typing to search records."
                  : `No matches for "${query.trim()}".`}
              </li>
            ) : (
              items.map((item, index) => {
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                const active = index === activeIndex;
                return (
                  <li key={item.key}>
                    {showGroup ? (
                      <p
                        className="text-fg-muted px-3 pt-3 pb-1 text-xs tracking-wide uppercase"
                        // The group name is decoration; the option's own
                        // label already carries the meaning, and announcing
                        // the heading as a list item would interrupt the
                        // activedescendant readout.
                        aria-hidden="true"
                      >
                        {item.group}
                      </p>
                    ) : null}
                    <div
                      id={`${listboxId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={active}
                      onClick={() => select(item)}
                      onMouseMove={() => setActiveIndex(index)}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm",
                        active ? "bg-accent-muted text-accent-text" : "text-fg",
                      )}
                    >
                      <item.icon
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium">{item.label}</span>
                      {item.sublabel ? (
                        <span className="text-fg-muted ml-auto truncate text-xs">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
