import type { Ref } from 'react';

/** Assign a node to one ref, returning that ref's own cleanup if it gave one. */
function assignRef<T>(
  ref: Ref<T> | undefined,
  value: T | null,
): (() => void) | undefined {
  if (typeof ref === 'function') {
    const cleanup = ref(value);
    return typeof cleanup === 'function' ? cleanup : undefined;
  }
  if (ref != null) (ref as { current: T | null }).current = value;
  return undefined;
}

/**
 * Merge several refs into one callback ref.
 *
 * It always returns a cleanup, because React 19 refs may return one: a callback
 * ref that returns a function gets that function called on detach and is NEVER
 * called with `null`. A merger that dropped those return values would silently
 * swallow the consumer's cleanup — so each ref's own cleanup is collected here,
 * and refs that returned nothing (plus object refs) get the legacy `null`
 * detach instead.
 */
export function mergeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): (node: T | null) => () => void {
  return (node) => {
    const cleanups = refs.map(
      (ref) => assignRef(ref, node) ?? (() => assignRef(ref, null)),
    );
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  };
}
