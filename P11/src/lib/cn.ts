import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes so a caller's class always wins over a primitive's
 * default, instead of the two both landing in the class list and the winner
 * being decided by stylesheet order.
 *
 * `clsx` resolves conditionals and arrays; `twMerge` then drops earlier
 * classes from the same utility group (`px-4 px-6` → `px-6`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
