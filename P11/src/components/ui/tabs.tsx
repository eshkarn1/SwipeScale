"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/cn";

/**
 * Tabs, on Radix.
 *
 * What the primitive guarantees, and the reason it is worth the dependency:
 * the tab list is ONE tab stop, with Left/Right (and Home/End) moving between
 * triggers, and Tab moving out of the list into the active panel. Each
 * trigger is wired to its panel with `aria-controls`/`aria-labelledby`, and
 * the inactive panels are removed from the accessibility tree rather than
 * merely hidden.
 *
 * `activationMode` is left at Radix's default ("automatic"), so arrowing
 * onto a trigger selects it. That is correct here because every panel's
 * content is already loaded on the server — there is nothing to fetch, so
 * there is no cost to a user arrowing past a tab, and automatic activation
 * is what a sighted keyboard user expects from a tab bar.
 */

const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "border-border flex items-center gap-1 border-b",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        // min-h-11 per BUILD_SPEC §6: a tab is a tap target, and a short
        // label does not make a small one.
        "relative min-h-11 cursor-pointer rounded-t-md px-4 text-sm font-medium",
        "text-fg-muted hover:text-fg",
        // Spelled out rather than `transition-colors`, which also covers
        // `outline-color` and makes the focus ring fade in as a blend of two
        // hues for 150ms. See button.tsx.
        "transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // The underline is drawn with a bottom border on a pseudo-element
        // rather than by growing the trigger, so switching tabs never shifts
        // the row by a pixel.
        "data-[state=active]:text-accent-text",
        "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent",
        "data-[state=active]:after:bg-accent",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "pt-5",
        // A panel that only contains non-focusable text is unreachable by
        // keyboard without this; Radix sets tabIndex=0 on the panel, and the
        // ring has to be visible when it lands there.
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
