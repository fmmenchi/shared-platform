import { clsx, type ClassValue } from 'clsx';

/**
 * Merge conditional class names. Plain `clsx` — no tailwind-merge: components
 * compose hashed CSS-module classes (not utility strings, per the styling
 * doctrine), so utility-conflict resolution has nothing to resolve and only
 * added bundle weight.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
