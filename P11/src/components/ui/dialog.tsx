"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Modal dialog, on Radix: focus is trapped while open, returned to the trigger
 * on close, the rest of the page is `aria-hidden`, and Escape closes.
 *
 * `DialogTitle` is mandatory — Radix warns loudly without one, because a dialog
 * with no accessible name is announced as an anonymous group. If a design has
 * no visible title, wrap it in `DialogTitle` with `sr-only`, never drop it.
 */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "bg-overlay fixed inset-0 z-50",
        "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The corner close button, shared with Sheet — which is the same Radix Dialog
 * anchored to an edge. Exported so the two cannot drift: an X that is 44px in
 * one overlay and 36px in the other is the kind of difference nobody notices
 * until it is everywhere.
 */
export function OverlayCloseButton({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      aria-label="Close"
      className={cn(
        "absolute top-4 right-4 inline-flex size-11 cursor-pointer items-center justify-center rounded-md",
        "text-fg-muted hover:bg-accent-muted hover:text-fg",
        "transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
      {...props}
    >
      <X className="size-5" aria-hidden="true" />
    </DialogPrimitive.Close>
  );
}

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Content> & {
  showClose?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
          "bg-surface border-border text-fg rounded-xl border p-6 shadow-[var(--shadow-panel)]",
          "flex max-h-[calc(100vh-4rem)] flex-col gap-4 overflow-y-auto",
          "data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out",
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? <OverlayCloseButton /> : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 pr-12 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
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

function DialogDescription({
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
