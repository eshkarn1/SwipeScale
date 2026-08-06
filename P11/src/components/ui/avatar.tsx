"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Avatar, on Radix — which handles the case that matters: the image is not
 * swapped in until it has actually loaded, so a broken or slow URL shows the
 * fallback rather than a flash of alt text or an empty box.
 *
 * The image is decorative here. Identity is carried by the name next to it,
 * so `alt` is empty by default rather than duplicating that name for a screen
 * reader; pass `alt` explicitly when the avatar stands alone.
 */

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full select-none",
  {
    variants: {
      size: {
        sm: "size-7 text-xs",
        md: "size-9 text-sm",
        lg: "size-11 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface AvatarProps
  extends
    React.ComponentPropsWithRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

function Avatar({ className, size, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  alt = "",
  ...props
}: React.ComponentPropsWithRef<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      alt={alt}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "bg-surface-raised text-fg-muted border-border flex size-full items-center justify-center border font-medium uppercase",
        className,
      )}
      {...props}
    />
  );
}

/**
 * First letter of the first two words. Deliberately not "first + last": a
 * single-word name is common (a company, a nickname) and slicing a second
 * initial off the end of one word produces nonsense like "SR" for "Sarah".
 */
export function initialsFrom(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}

export { Avatar, AvatarFallback, AvatarImage, avatarVariants };
