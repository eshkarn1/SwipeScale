"use client";

import {
  Building2,
  Copy,
  Inbox,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  initialsFrom,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Dropdown,
  DropdownCheckboxItem,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownSeparator,
  DropdownShortcut,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { brand } from "@/config/brand";

import { ThemeToggle } from "./theme-toggle";

/* ── Page furniture ────────────────────────────────────────────────────── */

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-primitive={id}
      className="border-border border-t pt-8 first:border-t-0 first:pt-0"
    >
      <div className="mb-5">
        <h2 className="font-display text-fg text-xl font-semibold">{title}</h2>
        {note ? <p className="text-fg-muted mt-1 text-sm">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border/60 flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6">
      {/* fg-muted rather than fg-subtle: measured 4.12:1 for fg-subtle on bg
          in dark at this size, which is under AA for text. */}
      <div className="text-fg-muted w-40 shrink-0 text-xs tracking-widest uppercase">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/* ── The sink ──────────────────────────────────────────────────────────── */

export function KitchenSink() {
  const [selected, setSelected] = useState<string>("");
  const [density, setDensity] = useState<string>("comfortable");
  const [showWon, setShowWon] = useState(true);
  const [showLost, setShowLost] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-bg text-fg min-h-screen">
        {/* Header. Painted in its final position in the first frame — no
            JS-driven reveal above the fold, ever. */}
        <header className="border-border bg-bg/95 sticky top-0 z-40 border-b backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <div>
              <h1 className="font-display text-fg text-lg font-semibold">
                {brand.name} kitchen sink
              </h1>
              <p className="text-fg-muted text-xs">
                M0 acceptance surface — every primitive, every state, both
                themes.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
          {/* ── Button ─────────────────────────────────────────────────── */}
          <Section
            id="button"
            title="Button"
            note="Every size clears 44px. Hover and focus-visible are live states — mouse over one, then Tab through the row."
          >
            <Row label="Variants">
              <Button variant="primary">Create deal</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Delete</Button>
            </Row>
            <Row label="Sizes">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Add deal">
                <Plus aria-hidden="true" />
              </Button>
            </Row>
            <Row label="With icon">
              <Button>
                <Plus className="size-4" aria-hidden="true" />
                New deal
              </Button>
              <Button variant="secondary">
                <Search className="size-4" aria-hidden="true" />
                Search
              </Button>
            </Row>
            <Row label="Loading">
              <Button loading>Saving</Button>
              <Button variant="secondary" loading>
                Saving
              </Button>
              <Button variant="danger" loading>
                Deleting
              </Button>
            </Row>
            <Row label="Disabled">
              <Button disabled>Primary</Button>
              <Button variant="secondary" disabled>
                Secondary
              </Button>
              <Button variant="outline" disabled>
                Outline
              </Button>
              <Button variant="ghost" disabled>
                Ghost
              </Button>
              <Button variant="danger" disabled>
                Danger
              </Button>
            </Row>
          </Section>

          {/* ── Input ──────────────────────────────────────────────────── */}
          <Section
            id="input"
            title="Input"
            note="Label, description and error are wired to the control by Field — htmlFor, aria-describedby and aria-invalid."
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Deal title">
                {(field) => (
                  <Input {...field} placeholder="e.g. 14 Elm Street" />
                )}
              </Field>

              <Field
                label="Expected close"
                description="Leave blank if the date is not agreed yet."
              >
                {(field) => <Input {...field} type="date" />}
              </Field>

              <Field
                label="Client email"
                error="That does not look like an email address."
              >
                {(field) => (
                  <Input
                    {...field}
                    defaultValue="jordan@"
                    invalid
                    inputMode="email"
                  />
                )}
              </Field>

              <Field label="Workspace slug" description="Cannot be changed.">
                {(field) => (
                  <Input {...field} defaultValue="northside" readOnly />
                )}
              </Field>

              <Field label="Disabled">
                {(field) => (
                  <Input {...field} placeholder="Not available" disabled />
                )}
              </Field>

              <Field label="With value">
                {(field) => <Input {...field} defaultValue="Jordan Avery" />}
              </Field>
            </div>
          </Section>

          {/* ── Select ─────────────────────────────────────────────────── */}
          <Section
            id="select"
            title="Select"
            note="Radix: type-ahead, arrow keys, Home/End, Escape, focus returns to the trigger."
          >
            <div className="grid gap-6 sm:grid-cols-3">
              <Field label="Stage">
                {(field) => (
                  <Select value={selected} onValueChange={setSelected}>
                    <SelectTrigger
                      id={field.id}
                      aria-describedby={field["aria-describedby"]}
                    >
                      <SelectValue placeholder="Choose a stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Open</SelectLabel>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="appointment">Appointment</SelectItem>
                        <SelectItem value="agreement">
                          Agreement signed
                        </SelectItem>
                        <SelectItem value="contract">Under contract</SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Closed</SelectLabel>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="archived" disabled>
                          Archived (disabled)
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field label="Owner" error="Pick an owner before saving.">
                {(field) => (
                  <Select>
                    <SelectTrigger
                      id={field.id}
                      aria-describedby={field["aria-describedby"]}
                      invalid
                    >
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jordan">Jordan Avery</SelectItem>
                      <SelectItem value="riley">Riley Chen</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>

              <Field label="Disabled">
                {(field) => (
                  <Select disabled>
                    <SelectTrigger id={field.id}>
                      <SelectValue placeholder="Not available" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>
          </Section>

          {/* ── Dialog ─────────────────────────────────────────────────── */}
          <Section
            id="dialog"
            title="Dialog"
            note="Focus is trapped while open and returned to the trigger on close. Escape closes."
          >
            <Row label="Modal">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mark this deal lost</DialogTitle>
                    <DialogDescription>
                      A lost deal keeps its history and stays in reporting. You
                      can restore it later.
                    </DialogDescription>
                  </DialogHeader>
                  <Field label="Reason" description="Required.">
                    {(field) => (
                      <Input
                        {...field}
                        placeholder="e.g. Went with another agent"
                      />
                    )}
                  </Field>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button variant="danger">Mark lost</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost">Destructive confirm</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Delete 3 contacts?</DialogTitle>
                    <DialogDescription>
                      They move to the recycle bin and are purged after 30 days.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Keep them</Button>
                    </DialogClose>
                    <Button variant="danger">
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Row>
          </Section>

          {/* ── Sheet ──────────────────────────────────────────────────── */}
          <Section
            id="sheet"
            title="Sheet"
            note="Edge-anchored dialog. Bottom is the mobile shape; a right-hand sheet at 375px is a takeover with a pointless slide."
          >
            <Row label="Sides">
              {(["right", "left", "bottom"] as const).map((side) => (
                <Sheet key={side}>
                  <SheetTrigger asChild>
                    <Button variant="secondary">Sheet · {side}</Button>
                  </SheetTrigger>
                  <SheetContent side={side}>
                    <SheetHeader>
                      <SheetTitle>Deal details</SheetTitle>
                      <SheetDescription>
                        Anchored to the {side} edge.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-col gap-4">
                      <Field label="Title">
                        {(field) => (
                          <Input {...field} defaultValue="14 Elm Street" />
                        )}
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="accent">Listing side</Badge>
                        <Badge variant="neutral">Under contract</Badge>
                      </div>
                    </div>
                    <SheetFooter>
                      <SheetClose asChild>
                        <Button variant="ghost">Cancel</Button>
                      </SheetClose>
                      <Button>Save</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              ))}
            </Row>
          </Section>

          {/* ── Dropdown ───────────────────────────────────────────────── */}
          <Section
            id="dropdown"
            title="Dropdown"
            note="Roving tabindex and type-ahead from Radix. Items are 44px, because the next one along is destructive."
          >
            <Row label="Menu">
              <Dropdown>
                <DropdownTrigger asChild>
                  <Button variant="secondary">
                    <Settings className="size-4" aria-hidden="true" />
                    Actions
                  </Button>
                </DropdownTrigger>
                <DropdownContent align="start">
                  <DropdownLabel>Deal</DropdownLabel>
                  <DropdownItem>
                    <Pencil aria-hidden="true" />
                    Edit
                    <DropdownShortcut>⌘E</DropdownShortcut>
                  </DropdownItem>
                  <DropdownItem>
                    <Copy aria-hidden="true" />
                    Duplicate
                  </DropdownItem>
                  <DropdownItem disabled>
                    <Building2 aria-hidden="true" />
                    Move to workspace (disabled)
                  </DropdownItem>
                  <DropdownSub>
                    <DropdownSubTrigger>
                      <Building2 aria-hidden="true" />
                      Assign to
                    </DropdownSubTrigger>
                    <DropdownSubContent>
                      <DropdownItem>Jordan Avery</DropdownItem>
                      <DropdownItem>Riley Chen</DropdownItem>
                    </DropdownSubContent>
                  </DropdownSub>
                  <DropdownSeparator />
                  <DropdownItem destructive>
                    <Trash2 aria-hidden="true" />
                    Delete deal
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>

              <Dropdown>
                <DropdownTrigger asChild>
                  <Button variant="outline">Filters &amp; density</Button>
                </DropdownTrigger>
                <DropdownContent align="start" className="w-56">
                  <DropdownLabel>Show</DropdownLabel>
                  <DropdownCheckboxItem
                    checked={showWon}
                    onCheckedChange={setShowWon}
                  >
                    Won deals
                  </DropdownCheckboxItem>
                  <DropdownCheckboxItem
                    checked={showLost}
                    onCheckedChange={setShowLost}
                  >
                    Lost deals
                  </DropdownCheckboxItem>
                  <DropdownSeparator />
                  <DropdownLabel>Density</DropdownLabel>
                  <DropdownRadioGroup
                    value={density}
                    onValueChange={setDensity}
                  >
                    <DropdownRadioItem value="comfortable">
                      Comfortable
                    </DropdownRadioItem>
                    <DropdownRadioItem value="compact">
                      Compact
                    </DropdownRadioItem>
                  </DropdownRadioGroup>
                </DropdownContent>
              </Dropdown>
            </Row>
          </Section>

          {/* ── Toast ──────────────────────────────────────────────────── */}
          <Section
            id="toast"
            title="Toast"
            note="sonner, restyled to our tokens. The region is aria-live and the timer pauses on hover and on focus."
          >
            <Row label="Kinds">
              <Button
                variant="secondary"
                onClick={() =>
                  toast("Deal saved", {
                    description: "14 Elm Street · $842,000",
                  })
                }
              >
                Default
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast.success("Moved to Under contract")}
              >
                Success
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast.error("Could not save", {
                    description: "The stage was changed by someone else.",
                  })
                }
              >
                Error
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast.loading("Importing contacts…", { duration: 3000 })
                }
              >
                Loading
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast("Deal deleted", {
                    action: { label: "Undo", onClick: () => toast("Restored") },
                  })
                }
              >
                With action
              </Button>
            </Row>
          </Section>

          {/* ── Badge ──────────────────────────────────────────────────── */}
          <Section
            id="badge"
            title="Badge"
            note="Status, not a control: no hover, no focus ring, no cursor."
          >
            <Row label="Variants">
              <Badge variant="neutral">Under contract</Badge>
              <Badge variant="accent">Won</Badge>
              <Badge variant="danger">Lost</Badge>
              <Badge variant="outline">Draft</Badge>
            </Row>
            <Row label="With icon">
              <Badge variant="accent">
                <Building2 aria-hidden="true" />
                Listing side
              </Badge>
              <Badge variant="neutral">
                <Inbox aria-hidden="true" />
                12 activities
              </Badge>
            </Row>
          </Section>

          {/* ── Avatar ─────────────────────────────────────────────────── */}
          <Section
            id="avatar"
            title="Avatar"
            note="Radix swaps the image in only once it has loaded, so a broken URL shows the fallback rather than a flash of alt text."
          >
            <Row label="Sizes">
              {(["sm", "md", "lg"] as const).map((size) => (
                <Avatar key={size} size={size}>
                  <AvatarFallback>
                    {initialsFrom("Jordan Avery")}
                  </AvatarFallback>
                </Avatar>
              ))}
            </Row>
            <Row label="Broken image">
              {/* Points at nothing on purpose — this is the fallback path. */}
              <Avatar size="lg">
                <AvatarImage src="/does-not-exist.png" />
                <AvatarFallback>{initialsFrom("Riley Chen")}</AvatarFallback>
              </Avatar>
              <span className="text-fg-muted text-sm">
                Falls back to initials.
              </span>
            </Row>
            <Row label="In a row">
              <div className="flex items-center gap-3">
                <Avatar size="md">
                  <AvatarFallback>{initialsFrom("Northside")}</AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <div className="text-fg text-sm">Northside Realty</div>
                  <div className="text-fg-muted text-xs">4 open deals</div>
                </div>
              </div>
            </Row>
          </Section>

          {/* ── Tooltip ────────────────────────────────────────────────── */}
          <Section
            id="tooltip"
            title="Tooltip"
            note="Opens on hover AND on keyboard focus. Never the only home for a piece of information — there is no hover on touch."
          >
            <Row label="On a control">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Delete deal"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete deal</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost">Weighted forecast</Button>
                </TooltipTrigger>
                <TooltipContent>
                  Sum of open deal values × each stage&rsquo;s probability.
                </TooltipContent>
              </Tooltip>
            </Row>
          </Section>

          {/* ── EmptyState ─────────────────────────────────────────────── */}
          <Section
            id="empty-state"
            title="EmptyState"
            note="The first-run screen of a CRM is entirely empty states, so each one says what to do next."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <EmptyState
                icon={Inbox}
                title="No deals yet"
                description="Deals you create land here. Start with the property you are working on today."
                action={
                  <Button>
                    <Plus className="size-4" aria-hidden="true" />
                    New deal
                  </Button>
                }
              />
              <EmptyState
                icon={Search}
                title="No matches"
                description="Nothing matched “elm street”. Try a shorter search, or clear your filters."
              />
            </div>
          </Section>

          {/* ── Skeleton ───────────────────────────────────────────────── */}
          <Section
            id="skeleton"
            title="Skeleton"
            note="aria-hidden, and the pulse stops under prefers-reduced-motion. Size it like the element it replaces or it becomes a layout shift."
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="min-h-row w-full" />
                ))}
              </div>
            </div>
          </Section>
        </main>
      </div>
    </TooltipProvider>
  );
}
