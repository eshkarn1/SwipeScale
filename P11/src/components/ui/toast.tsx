"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export { toast } from "sonner";

/**
 * Toast, on sonner. Mounted once in the root layout; everything else calls
 * `toast(...)` imperatively.
 *
 * Sonner already renders its region as `aria-live` and pauses the dismiss timer
 * on hover and on focus, which is the part hand-rolled toasts get wrong.
 *
 * Styling goes through BOTH sonner's CSS custom properties and `classNames`,
 * deliberately: the custom properties are what its internal `:where()` rules
 * read (colour, so it is themed even in states we have not classed), and the
 * classNames carry our radius, shadow and type. Neither alone covers it.
 *
 * The colour values here are `var(--color-*)` references, not literals — the
 * rule in globals.css is that no colour literal appears outside that file, and
 * an inline style is not an exemption.
 */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "dark"}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "font-mono rounded-lg border shadow-[var(--shadow-popover)] text-sm",
          title: "font-medium",
          description: "text-fg-muted",
          actionButton: "rounded-md min-h-8 px-3 cursor-pointer",
          cancelButton: "rounded-md min-h-8 px-3 cursor-pointer",
          closeButton: "cursor-pointer",
        },
      }}
      style={
        {
          "--normal-bg": "var(--color-surface-raised)",
          "--normal-text": "var(--color-fg)",
          "--normal-border": "var(--color-border-strong)",
          "--success-bg": "var(--color-surface-raised)",
          "--success-text": "var(--color-accent-text)",
          "--success-border": "var(--color-border-strong)",
          "--error-bg": "var(--color-surface-raised)",
          "--error-text": "var(--color-danger)",
          "--error-border": "var(--color-border-strong)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
