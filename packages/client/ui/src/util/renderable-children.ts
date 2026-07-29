import type { ReactNode } from 'react';

/**
 * Whether `children` would render anything visible.
 *
 * A text part that registers itself into `aria-describedby` must not do so when
 * it is empty — an id pointing at a blank element is worse than no reference. A
 * plain truthiness check is not enough: React renders NOTHING for `null`,
 * `undefined`, booleans, `''` or an empty array, and the empty array is the case
 * consumers actually hit, because mapping a validation array is the idiomatic
 * shape (`{errors.map(...)}` with no errors). Whitespace-only text counts as
 * empty too. `0` does NOT — React renders "0".
 */
export function hasRenderableChildren(children: ReactNode): boolean {
  if (children == null || typeof children === 'boolean') return false;
  if (typeof children === 'string') return children.trim() !== '';
  if (Array.isArray(children)) return children.some(hasRenderableChildren);
  return true;
}
