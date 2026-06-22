import { clsx, type ClassValue } from 'clsx'

/** Conditional className join. Kept clsx-only (no tailwind-merge) to stay
 *  compatible with Tailwind v4's custom utility names. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
