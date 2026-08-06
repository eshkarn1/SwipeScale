import { cn } from "@/lib/cn";

/**
 * Skeleton — a loading placeholder.
 *
 * `aria-hidden` and no text: a screen reader should hear the loading state
 * announced once by the region that owns it, not a dozen anonymous pulsing
 * boxes. The pulse is suppressed under `prefers-reduced-motion`.
 *
 * Size it with the same utilities as the real element it replaces. A skeleton
 * whose height differs from its content is a layout shift waiting to happen.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-skeleton animate-pulse rounded-md motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
