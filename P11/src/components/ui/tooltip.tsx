"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/cn";

/**
 * Tooltip, on Radix. Opens on hover AND on keyboard focus, closes on Escape.
 *
 * A tooltip is a supplement, never the only place a piece of information
 * lives: it is unreachable on touch, where there is no hover. If a control
 * cannot be understood without its tooltip, the control needs a visible label.
 * An icon-only Button still needs `aria-label` — the tooltip is not a
 * substitute for one, because Radix links it with `aria-describedby`.
 */

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentPropsWithRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "bg-surface-raised text-fg border-border z-50 max-w-xs rounded-md border px-3 py-1.5 text-xs",
          "shadow-[var(--shadow-popover)]",
          "data-[state=delayed-open]:animate-popover-in data-[state=closed]:animate-popover-out",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-surface-raised" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
