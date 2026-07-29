import { useCallback, useState } from 'react';

/** What a group hands to its description/error parts to describe itself. */
export interface DescribedByRegistry {
  /** Space-joined ids of the registered part(s), in registration order. */
  describedBy: string | undefined;
  /** A part registers its own id; the returned cleanup unregisters it. */
  register: (id: string) => () => void;
}

/**
 * An `aria-describedby` registry for a group of text parts. Each part registers
 * its OWN id (keyed BY the id), so several coexist, each cleans up
 * independently, and the described element references exactly the parts
 * actually in the DOM — never a dangling id. Shared by `Field` (one control)
 * and `Fieldset` (a group of controls).
 */
export function useDescribedByRegistry(): DescribedByRegistry {
  const [ids, setIds] = useState<string[]>([]);
  const register = useCallback<DescribedByRegistry['register']>((id) => {
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    return () => setIds((prev) => prev.filter((x) => x !== id));
  }, []);
  return { describedBy: ids.join(' ') || undefined, register };
}
