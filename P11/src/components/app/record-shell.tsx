"use client";

import Link from "next/link";
import { CalendarClock, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { LucideIcon } from "lucide-react";

/**
 * The record detail layout required by BUILD_SPEC §7 M2, verbatim: "Record
 * detail = left summary panel, center tabs (Overview / Activity / Deals /
 * Files), right context rail."
 *
 * All three record types share this one component rather than each laying
 * itself out, so the three pages cannot drift — the reason `company`,
 * `contact` and `deal` detail currently look identical is that they are the
 * same component with different props, and that stays true as M3–M5 add to
 * them.
 *
 * ── READING ORDER vs VISUAL ORDER ─────────────────────────────────────────
 * The DOM order is summary -> tabs -> rail, which is also the reading order
 * for a screen reader and the tab order for a keyboard user, and it matches
 * the visual left-to-right order on desktop. On narrow viewports the three
 * regions simply stack in that same order, so nothing has to be reordered
 * with CSS and no `order-*` utility can desynchronise focus from what is on
 * screen.
 */

export interface RecordTab {
  value: string;
  label: string;
  content: React.ReactNode;
}

export interface RecordAction {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function RecordShell({
  backHref,
  backLabel,
  title,
  subtitle,
  deleted = false,
  actionsLabel,
  actions,
  summary,
  tabs,
  rail,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string | null;
  deleted?: boolean;
  /** Accessible name for the actions menu, e.g. "Company actions". */
  actionsLabel: string;
  actions: RecordAction[];
  summary: React.ReactNode;
  tabs: RecordTab[];
  rail: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href={backHref}
        className={cn(
          "text-fg-muted hover:text-fg mb-4 inline-flex min-h-11 items-center text-sm",
          "transition-[color] duration-150 motion-reduce:transition-none",
          "focus-visible:outline-ring rounded-md focus-visible:outline-2 focus-visible:outline-offset-2",
        )}
      >
        ← {backLabel}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{title}</h1>
          {subtitle ? (
            <p className="text-fg-muted truncate text-sm">{subtitle}</p>
          ) : null}
          {deleted ? (
            <Badge variant="danger" className="mt-2">
              Deleted
            </Badge>
          ) : null}
        </div>

        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="secondary" size="icon" aria-label={actionsLabel}>
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            {actions.map((action) => (
              <DropdownItem
                key={action.label}
                destructive={action.destructive}
                disabled={action.disabled}
                onSelect={action.onSelect}
              >
                {action.icon ? (
                  <action.icon className="size-4" aria-hidden="true" />
                ) : null}
                {action.label}
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
      </div>

      {/* Fixed flanks, flexible centre: the tab panels hold the long-form
          content and must not be the region that gives up width first. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)_17rem]">
        <aside
          aria-label="Summary"
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <div className="border-border bg-surface rounded-lg border p-5">
            {summary}
          </div>
        </aside>

        <div className="min-w-0">
          <Tabs defaultValue={tabs[0]?.value}>
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <aside
          aria-label="Related records"
          className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start"
        >
          {rail}
        </aside>
      </div>
    </div>
  );
}

/** A labelled value inside the summary panel or a tab panel. */
export function RecordField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-fg-muted text-xs tracking-wide uppercase">{label}</dt>
      <dd className="text-fg mt-0.5 break-words">{value ?? "—"}</dd>
    </div>
  );
}

/** A titled block in the right rail. */
export function RailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-surface rounded-lg border p-5">
      <h2 className="text-fg-muted mb-3 text-xs font-medium tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The Activity and Files tabs, until the milestones that fill them.
 *
 * Deliberately a real, designed empty state that names the milestone rather
 * than placeholder rows or invented items. BUILD_SPEC scopes activities and
 * the timeline to M4 and file storage to M8; showing fabricated entries in
 * the meantime would have to be unpicked later and would make the product
 * look like it does something it does not.
 */
export function NotYetTab({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return <EmptyState icon={icon} title={title} description={description} />;
}

/** Created / last updated, shown at the foot of every rail. */
export function RecordMeta({
  createdAt,
  updatedAt,
}: {
  createdAt: Date;
  updatedAt: Date;
}) {
  return (
    <RailSection title="Record">
      <dl className="flex flex-col gap-3 text-sm">
        <RecordField
          label="Created"
          value={
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {formatTimestamp(createdAt)}
            </span>
          }
        />
        <RecordField
          label="Last updated"
          value={
            <span className="font-mono text-xs">
              {formatTimestamp(updatedAt)}
            </span>
          }
        />
      </dl>
    </RailSection>
  );
}

/**
 * BUILD_SPEC §8: timestamps are stored UTC and rendered in the user's
 * timezone. `Date` is one of the types React's Flight protocol carries
 * natively (unlike `Prisma.Decimal` — see src/lib/serialize.ts), so the
 * instance arrives intact and the browser's own locale does the conversion.
 */
function formatTimestamp(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
