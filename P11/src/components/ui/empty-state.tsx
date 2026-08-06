import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * EmptyState.
 *
 * `action` is not optional by accident — an empty state that only says "no
 * deals" tells a new user what is missing and not what to do about it, and the
 * first-run screen of a CRM is entirely empty states. Pass an action unless the
 * emptiness is genuinely terminal (a search with no results), which is what
 * `description` is for.
 *
 * The icon is decorative; the heading carries the meaning.
 */
export interface EmptyStateProps extends React.ComponentPropsWithRef<"div"> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border bg-surface flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div
          className="bg-accent-muted text-accent-text mb-4 flex size-12 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <Icon className="size-6" />
        </div>
      ) : null}
      <h3 className="font-display text-fg text-base font-semibold">{title}</h3>
      {description ? (
        <p className="text-fg-muted mt-1.5 max-w-sm text-sm text-balance">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
