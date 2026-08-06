"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Select, on Radix — which gives us the whole keyboard contract for free:
 * type-ahead, arrow navigation, Home/End, Escape to close, focus returned to
 * the trigger on close, and `aria-activedescendant` wiring we would otherwise
 * get subtly wrong.
 *
 * Not a native `<select>`: the options need our own surface, and a native
 * popup cannot be themed. Everything a native select does for a keyboard is
 * reproduced by Radix.
 */

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  children,
  invalid,
  ...props
}: React.ComponentPropsWithRef<typeof SelectPrimitive.Trigger> & {
  invalid?: boolean;
}) {
  return (
    <SelectPrimitive.Trigger
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
        "bg-surface text-fg border-border-strong cursor-pointer border text-left",
        "transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none",
        "hover:border-fg-subtle",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger",
        "data-[placeholder]:text-fg-muted",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown
          className="text-fg-muted size-4 shrink-0"
          aria-hidden="true"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentPropsWithRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          "bg-surface-raised border-border text-fg z-50 min-w-[8rem] overflow-hidden rounded-lg border shadow-[var(--shadow-popover)]",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn(
        "text-fg-muted px-2 py-1.5 text-xs font-medium tracking-wide uppercase",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        // 44px per row here too: a dropdown option is a tap target.
        "relative flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md py-2 pr-8 pl-3 text-sm outline-hidden select-none",
        // Radix moves `data-highlighted` with both mouse and keyboard, so the
        // hover and the keyboard-focus state are one style rather than two
        // that drift apart.
        "data-[highlighted]:bg-accent-muted data-[highlighted]:text-fg",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-3 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="text-accent-text size-4" aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
