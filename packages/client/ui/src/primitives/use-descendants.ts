import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  Descendant,
  DescendantRegistry,
  Descendants,
} from './use-descendants.types.js';

const MARKER = 'data-fm-descendant';

/**
 * The parts of a compound component, in TREE order.
 *
 * A menu has to know what "the next item" is, and the answer is a DOM fact —
 * which is why this does not keep an ordered list. Parts register themselves in
 * any order, and the order is READ when somebody asks, by walking the root's
 * subtree. Reach's and Chakra's `useDescendants` sort with
 * `compareDocumentPosition` at registration and must re-sort whenever the tree
 * moves; this cannot fall out of step with the DOM because it keeps nothing in
 * step. Measured cost of a read with 300 parts: 0.05ms, and it happens on a
 * keypress rather than on a render.
 *
 * NESTING WORKS BY CONSTRUCTION. A submenu's parts carry the same marker and sit
 * inside the outer root's subtree, so a selector alone would swallow them — but
 * they are registered with the SUBMENU, and anything not in this family's own
 * registry is dropped. No scopes, no ids threaded through the tree. What the
 * mechanism really needs is DOM CONTAINMENT: a part moved out of the root's
 * subtree — by a portal, say — stops being one, which is why nothing in this
 * package portals.
 *
 * Parts join with `useDescendant`, never by calling into this handle: the
 * membership has to end when the element goes, and only a hook can promise that.
 */
export function useDescendants<Data = undefined>(): Descendants<Data> {
  const root = useRef<HTMLElement | null>(null);
  const entries = useRef(new Map<HTMLElement, Data>());

  const rootRef = useCallback((element: HTMLElement | null) => {
    root.current = element;
  }, []);

  const registry = useMemo<DescendantRegistry<Data>>(
    () => ({
      add: (element, data) => {
        element.setAttribute(MARKER, '');
        entries.current.set(element, data);
      },
      update: (element, data) => {
        // Only for something already in: an update must not resurrect a part
        // that has left, which is what a plain `set` would do.
        if (entries.current.has(element)) entries.current.set(element, data);
      },
      remove: (element) => {
        entries.current.delete(element);
        // Taken off again, because it was written onto somebody else's element.
        element.removeAttribute(MARKER);
      },
    }),
    [],
  );

  const items = useCallback((): Descendant<Data>[] => {
    const element = root.current;
    if (!element) return [];

    return (
      Array.from(element.querySelectorAll<HTMLElement>(`[${MARKER}]`))
        .filter((node) => entries.current.has(node))
        // NOT RENDERED, NOT NAVIGABLE. `display: none` is the same hazard this
        // hook already guards against when React detaches a ref and keeps the
        // node: an item nobody can see, offered to the keyboard as "the next
        // one". A part that a media query has taken out of the layout — a
        // control that exists only on a touch screen, say — is exactly that.
        //
        // `checkVisibility()` at its default, which asks about `display` and
        // `content-visibility` and NOT about `visibility` — deliberately: a
        // family that has stepped aside for one nested inside it is still the
        // family the focus comes back to.
        .filter((node) => node.checkVisibility())
        .map((node) => ({
          element: node,
          data: entries.current.get(node) as Data,
        }))
    );
  }, []);

  const indexOf = useCallback(
    (element: HTMLElement | null): number =>
      element === null
        ? -1
        : items().findIndex((item) => item.element === element),
    [items],
  );

  return useMemo(
    () => ({ rootRef, items, indexOf, registry }),
    [rootRef, items, indexOf, registry],
  );
}

/**
 * A part joining its family. Returns the ref to put on its element.
 *
 * The ref is STABLE — one attach per mount, not one per render — and it returns
 * a cleanup, which is how membership ends. The first version ignored React's
 * detach call (`null`) and kept every element it had ever seen: measured, 1000
 * elements created and thrown away left 1000 live entries, each pinning a
 * detached node for the life of the page. Worse than the memory, a detached
 * element that is still IN the document — which is exactly what
 * `<Activity mode="hidden">` produces, refs detached and DOM kept — stayed a
 * navigable item: invisible, unfocusable, and offered to the user as "the next
 * one".
 *
 * `data` is refreshed on every render, so what `items()` reports is never the
 * value from a render ago.
 */
export function useDescendant<Data>(
  family: Descendants<Data>,
  data: Data,
): (element: HTMLElement | null) => void {
  const { registry } = family;
  const element = useRef<HTMLElement | null>(null);
  // Only ever read at ATTACH, which happens on the first commit — so the value
  // captured here is the right one, and there is nothing to keep up to date.
  // (Writing to it during render would be a ref write during render, and the
  // compiler's lint says so.) Every later render refreshes the data through the
  // effect below instead.
  const initial = useRef(data);

  useEffect(() => {
    if (element.current) registry.update(element.current, data);
  });

  return useCallback(
    (node: HTMLElement | null) => {
      if (node === null) return;
      element.current = node;
      registry.add(node, initial.current);

      // React 19 calls this when the element goes — including when it stays in
      // the document but stops being ours.
      return () => {
        element.current = null;
        registry.remove(node);
      };
    },
    [registry],
  );
}
