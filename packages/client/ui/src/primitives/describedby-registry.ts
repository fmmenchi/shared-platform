import { useCallback, useMemo, useState } from 'react';
import type {
  DescribedByPart,
  DescribedByRegistry,
} from './describedby-registry.types.js';

/** Order two registered parts by their position in the document. */
function byDocumentPosition(a: DescribedByPart, b: DescribedByPart): number {
  const relation = a.node.compareDocumentPosition(b.node);
  if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (relation & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

/**
 * An `aria-describedby` registry for a group of text parts. Each part registers
 * its OWN id (keyed BY the id), so several coexist and each cleans up
 * independently, and the described element references only parts that are
 * currently mounted. Shared by `Field` (one control) and `Fieldset` (a group).
 *
 * The ids are sorted by DOM position, NOT by the order the parts happened to
 * register in: `aria-describedby` order IS announcement order, while
 * registration runs in effect order — so a part that mounts late (a conditional
 * hint, a remount after a `key` change) would otherwise land last and could put
 * the error before the rule it contradicts.
 */
export function useDescribedByRegistry(): DescribedByRegistry {
  const [parts, setParts] = useState<DescribedByPart[]>([]);
  const register = useCallback<DescribedByRegistry['register']>((id, node) => {
    setParts((prev) =>
      prev.some((part) => part.id === id) ? prev : [...prev, { id, node }],
    );
    return () => setParts((prev) => prev.filter((part) => part.id !== id));
  }, []);

  const describedBy = useMemo(
    () =>
      [...parts]
        .sort(byDocumentPosition)
        .map((part) => part.id)
        .join(' ') || undefined,
    [parts],
  );

  return { describedBy, register };
}
