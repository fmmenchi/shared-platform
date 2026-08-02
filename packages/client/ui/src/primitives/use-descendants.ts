import { useCallback, useMemo, useRef } from 'react';
import type { Descendant, Descendants } from './use-descendants.types.js';

const MARKER = 'data-fm-descendant';

/**
 * The parts of a compound component, in the order the user meets them.
 *
 * A menu has to know what "the next item" is, and the answer is a DOM fact —
 * which is why this does not try to keep an ordered list. Parts register
 * themselves in any order, and the order is READ when somebody asks, by walking
 * the root's subtree. The classic implementations of this pattern (Reach's and
 * Chakra's `useDescendants`) sort with `compareDocumentPosition` on every
 * registration and have to re-sort whenever the tree moves; this cannot fall out
 * of step with the DOM because it has nothing to keep in step.
 *
 * It costs a `querySelectorAll` per read, which happens on a keypress and not on
 * a render.
 *
 * NESTING WORKS BY CONSTRUCTION. A submenu's items carry the same marker and sit
 * inside the outer root's subtree, so a selector alone would swallow them — but
 * they are registered in the SUBMENU's map, not this one, and anything not in
 * our map is dropped. No scopes, no ids to thread.
 *
 * Registrations are held in a ref: a part appearing or leaving must not re-render
 * the family it belongs to.
 */
export function useDescendants<Data = undefined>(): Descendants<Data> {
  const root = useRef<HTMLElement | null>(null);
  const registry = useRef(new Map<HTMLElement, Data>());

  const rootRef = useCallback((element: HTMLElement | null) => {
    root.current = element;
  }, []);

  const register = useCallback(
    (data: Data): ((element: HTMLElement | null) => void) =>
      (element) => {
        if (element === null) return;
        element.setAttribute(MARKER, '');
        registry.current.set(element, data);
      },
    [],
  );

  const items = useCallback((): Descendant<Data>[] => {
    const element = root.current;
    if (!element) return [];

    // Read the DOM, then keep only what is ours — which is what makes a nested
    // family's parts invisible to this one.
    return Array.from(element.querySelectorAll<HTMLElement>(`[${MARKER}]`))
      .filter((element) => registry.current.has(element))
      .map((item) => ({
        element: item,
        data: registry.current.get(item) as Data,
      }));
  }, []);

  const indexOf = useCallback(
    (element: HTMLElement | null): number =>
      element === null
        ? -1
        : items().findIndex((item) => item.element === element),
    [items],
  );

  return useMemo(
    () => ({ rootRef, register, items, indexOf }),
    [rootRef, register, items, indexOf],
  );
}
