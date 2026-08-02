import type { RefCallback } from 'react';

/** One registered descendant: its element, and whatever its part told us about it. */
export interface Descendant<Data> {
  element: HTMLElement;
  data: Data;
}

/**
 * What a family's root gets back, to hand to its parts and to read from.
 *
 * `items()` returns a NEW array of NEW objects every call. Call it inside the
 * handler that needs it — a keypress, a pointer move — and never in render or
 * in a dependency array, where it is a fresh value every time and will spin an
 * effect forever.
 */
export interface Descendants<Data> {
  /**
   * Put this on the element the descendants live inside. A CALLBACK ref, so the
   * handle carries no ref object: handing one to a child during render counts
   * as reading it, and the React Compiler's lint is right to say so.
   */
  rootRef: RefCallback<HTMLElement>;
  /**
   * Everyone registered, in TREE order — read at the moment you ask, by walking
   * the root's subtree. Tree order is what the browser's own sequential focus
   * navigation follows, so it matches Tab even where CSS `order` or a reversed
   * flex row disagrees with the eye (measured); a family that reorders visually
   * has already broken that mapping for every native control on the page.
   *
   * The root itself is never among them, even if it registers.
   */
  items: () => Descendant<Data>[];
  /** Where this element sits among them, or `-1` if it is not one of ours. */
  indexOf: (element: HTMLElement | null) => number;
  /** Internal: how `useDescendant` reaches the registry. Not for parts to call. */
  readonly registry: DescendantRegistry<Data>;
}

/** @internal shared between the family and its parts. */
export interface DescendantRegistry<Data> {
  add: (element: HTMLElement, data: Data) => void;
  update: (element: HTMLElement, data: Data) => void;
  remove: (element: HTMLElement) => void;
}
