import type { RefCallback } from 'react';

/** One registered descendant: its element, and whatever its part told us about it. */
export interface Descendant<Data> {
  element: HTMLElement;
  data: Data;
}

/** What a family's root gets back, to hand to its parts and to read from. */
export interface Descendants<Data> {
  /**
   * Put this on the element the descendants live inside. A CALLBACK ref, so the
   * handle carries no ref object: handing one to a child during render counts
   * as reading it, and the React Compiler's lint is right to say so.
   */
  rootRef: RefCallback<HTMLElement>;
  /**
   * A part announcing itself: returns the ref it must put on its element.
   * Stable for a given `data` identity, so it can go straight into JSX.
   */
  register: (data: Data) => RefCallback<HTMLElement>;
  /** Everyone registered, in DOM ORDER — read at the moment you ask. */
  items: () => Descendant<Data>[];
  /** Where this element sits among them, or `-1` if it is not one of ours. */
  indexOf: (element: HTMLElement | null) => number;
}
