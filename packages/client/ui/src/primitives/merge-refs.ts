import type { Ref } from 'react';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref != null) (ref as { current: T | null }).current = value;
}

/** Merge several refs into one callback ref (assigns each on mount/unmount). */
export function mergeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) assignRef(ref, node);
  };
}
