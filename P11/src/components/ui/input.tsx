"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

/**
 * Input, plus the three pieces of furniture a form control needs to be
 * accessible: a real `<label>`, a description, and an error message.
 *
 * They are in one file on purpose. A `Label` shipped separately gets used
 * separately, and the association between the two — `htmlFor`, `aria-describedby`,
 * `aria-invalid` — is exactly the part that gets forgotten. `Field` wires it.
 */

export interface InputProps extends React.ComponentPropsWithRef<"input"> {
  /** Marks the control invalid for assistive tech and paints the error border. */
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-11 w-full rounded-md px-3 py-2 text-sm",
        "bg-surface text-fg border",
        // Placeholders use fg-muted (6.99:1), never fg-subtle — globals.css is
        // explicit that fg-subtle is UI/large text only.
        "placeholder:text-fg-muted",
        // border-strong, not border: a form-control boundary has to clear the
        // 3:1 of WCAG 1.4.11, and the decorative hairline is 1.24:1.
        "border-border-strong",
        "transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none",
        "hover:border-fg-subtle",
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Written as an arbitrary variant rather than `aria-invalid:` because
        // `aria-invalid` is not one of Tailwind's built-in aria variants.
        "aria-[invalid=true]:border-danger",
        "read-only:text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<"label">) {
  return (
    <label
      className={cn(
        "text-fg block cursor-pointer text-sm font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export interface FieldProps {
  label: string;
  /** Helper text. Announced via `aria-describedby`. */
  description?: string;
  /** When present the control is marked invalid and this is announced. */
  error?: string;
  className?: string;
  /**
   * Receives the ids to wire up. Any control that accepts `id`,
   * `aria-describedby` and `aria-invalid` works here, not just `Input`.
   */
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
  }) => React.ReactNode;
}

/**
 * Label + control + description + error, correctly associated.
 *
 * The error is `role="alert"` so it is announced when it appears, rather than
 * only being found by a user who happens to arrow onto it.
 */
export function Field({
  label,
  description,
  error,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const describedBy =
    [description ? descriptionId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {description ? (
        <p id={descriptionId} className="text-fg-muted text-xs">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
