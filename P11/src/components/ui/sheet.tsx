"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";

import { OverlayCloseButton } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

/**
 * Sheet — an edge-anchored dialog. Built on Radix Dialog rather than a second
 * overlay implementation, so it inherits the identical focus trap, Escape
 * handling and scroll lock. The only difference is where it comes from.
 *
 * `bottom` exists because a right-hand sheet on a 375px screen is a full-screen
 * takeover with a pointless slide; the sheet a phone wants comes up from the
 * bottom edge.
 */

const sheetVariants = cva(
  [
    "bg-surface border-border text-fg fixed z-50 flex flex-col gap-4 p-6 shadow-[var(--shadow-panel)]",
  ],
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 h-full w-full max-w-md border-l data-[state=open]:animate-sheet-in-right data-[state=closed]:animate-sheet-out-right",
        left: "inset-y-0 left-0 h-full w-full max-w-md border-r data-[state=open]:animate-sheet-in-left data-[state=closed]:animate-sheet-out-left",
        bottom:
          "inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl border-t data-[state=open]:animate-sheet-in-bottom data-[state=closed]:animate-sheet-out-bottom",
      },
    },
    defaultVariants: { side: "right" },
  },
);

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  side,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Content> &
  VariantProps<typeof sheetVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "bg-overlay fixed inset-0 z-50",
          "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
        )}
      />
      <DialogPrimitive.Content
        className={cn(sheetVariants({ side }), "overflow-y-auto", className)}
        {...props}
      >
        {children}
        <OverlayCloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-1.5 pr-12", className)} {...props} />
  );
}

function SheetFooter({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-col-reverse gap-2 sm:flex-row",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-fg text-lg font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-fg-muted text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
