"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Dropdown menu, on Radix. Roving tabindex, type-ahead, Escape, and
 * `role="menu"` / `role="menuitem"` semantics come with it.
 *
 * Menu items are 44px like every other target — a menu is the place where a
 * cramped row is most likely to mis-fire, because the next item is a
 * destructive one.
 */

const itemBase = [
  "relative flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-hidden select-none",
  "data-[highlighted]:bg-accent-muted data-[highlighted]:text-fg",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:size-4 [&_svg]:shrink-0",
];

const contentBase = [
  "bg-surface-raised border-border text-fg z-50 min-w-[10rem] overflow-hidden rounded-lg border p-1 shadow-[var(--shadow-popover)]",
  "data-[state=open]:animate-popover-in data-[state=closed]:animate-popover-out",
];

const Dropdown = DropdownMenuPrimitive.Root;
const DropdownTrigger = DropdownMenuPrimitive.Trigger;
const DropdownGroup = DropdownMenuPrimitive.Group;
const DropdownSub = DropdownMenuPrimitive.Sub;
const DropdownRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(contentBase, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownItem({
  className,
  destructive,
  ...props
}: React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.Item> & {
  /** Paints the item in the danger hue. Destructive actions only (§6). */
  destructive?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        itemBase,
        destructive && "text-danger data-[highlighted]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

function DropdownCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(itemBase, "pl-9", className)}
      {...props}
    >
      <span className="absolute left-3 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="text-accent-text size-4" aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownRadioItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(itemBase, "pl-9", className)}
      {...props}
    >
      <span className="absolute left-3 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle
            className="fill-accent-text text-accent-text size-2"
            aria-hidden="true"
          />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownLabel({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "text-fg-muted px-3 py-1.5 text-xs font-medium tracking-wide uppercase",
        className,
      )}
      {...props}
    />
  );
}

function DropdownSeparator({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function DropdownShortcut({
  className,
  ...props
}: React.ComponentPropsWithRef<"span">) {
  return (
    <span
      // fg-muted, not fg-subtle. MEASURED in the browser at 12px: fg-subtle is
      // 4.12:1 on bg in dark, which fails AA for text this size. fg-subtle's
      // documented role is large text and non-text UI, and a keyboard shortcut
      // is neither.
      className={cn("text-fg-muted ml-auto text-xs tracking-widest", className)}
      {...props}
    />
  );
}

function DropdownSubTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.SubTrigger>) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(itemBase, "data-[state=open]:bg-accent-muted", className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-4" aria-hidden="true" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownSubContent({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        className={cn(contentBase, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export {
  Dropdown,
  DropdownCheckboxItem,
  DropdownContent,
  DropdownGroup,
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
};
