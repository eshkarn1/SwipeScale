import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Badge — a status label, not a control. It has no hover, no focus ring and no
 * cursor, because tapping one does nothing. If it needs to do something it is
 * a Button.
 *
 * Every variant's foreground was checked against its own tinted background,
 * not against the page: `accent` is 6.46:1 on accent-muted in dark and 6.37:1
 * in light, `danger` 4.74:1 and 5.40:1. Those are the pairs that actually
 * render, and a token that passes on the page can still fail on a tint.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5",
    "text-xs font-medium whitespace-nowrap",
    "[&_svg]:size-3 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        neutral: "bg-surface-raised text-fg-muted border-border border",
        /** Won state. §6: the positive hue in this product is amber, not green. */
        accent: "bg-accent-muted text-accent-text",
        /** Lost state and hard failures only. */
        danger: "bg-danger-muted text-danger",
        outline: "border-border-strong text-fg border bg-transparent",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends
    React.ComponentPropsWithRef<"span">,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
