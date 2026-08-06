"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Button.
 *
 * Every size clears 44px (`min-h-11`) per BUILD_SPEC §6 density and the tap
 * target minimum — `sm` differs from `md` in padding and type size, never in
 * height. A small label does not make a small target.
 *
 * Disabled deliberately does NOT set `pointer-events-none`: that would also
 * suppress `cursor-not-allowed`, and the cursor is the only affordance telling
 * a mouse user why nothing happened. The native `disabled` attribute already
 * blocks the click.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "min-h-11 rounded-md font-medium cursor-pointer select-none",
    // The property list is spelled out rather than using `transition-colors`,
    // which also covers `outline-color`: with it, the focus ring animates in
    // from the text colour and spends 150ms as a blend of two hues. A focus
    // indicator has to be right on the frame it appears.
    "transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** The one amber object on the screen. Label is near-black: 9.02:1. */
        primary: "bg-accent text-accent-fg hover:bg-accent/90",
        secondary:
          "bg-surface-raised text-fg border border-border-strong hover:bg-surface",
        outline:
          "border border-border-strong bg-transparent text-fg hover:bg-accent-muted",
        ghost: "bg-transparent text-fg hover:bg-accent-muted",
        /** Destructive only (§6). Never for a merely irreversible action. */
        danger: "bg-danger text-danger-fg hover:bg-danger/90",
      },
      size: {
        sm: "px-3 text-sm",
        md: "px-4 text-sm",
        lg: "min-h-12 px-6 text-base",
        /** Square. Requires an accessible name via `aria-label`. */
        icon: "size-11 p-0 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ComponentPropsWithRef<"button">,
    VariantProps<typeof buttonVariants> {
  /**
   * Renders a spinner, marks the button `aria-busy`, and disables it — so a
   * pending mutation cannot be fired twice by an impatient double-click.
   */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      // Buttons default to type="submit" inside a form, which silently submits
      // it. Opt in to that instead of falling into it.
      type={type}
      className={cn(
        buttonVariants({ variant, size }),
        // A loading button is disabled but must not also look faded — the
        // spinner already says why it is inert. Decided here rather than with
        // an `aria-busy:` variant, because that would tie the outcome to CSS
        // source order against an equally specific `disabled:` rule.
        !loading && "disabled:opacity-50",
        className,
      )}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}

export { buttonVariants };
