import type { RefCallback } from 'react';

/** What the focusable element of a menu row needs, whatever element it is. */
export interface MenuCommandProps {
  id: string;
  /** One tab stop per menu: only the active row is reachable with `Tab`. */
  tabIndex: number;
  /** Announced AND inert — never the native `disabled` (the APG's rule). */
  'aria-disabled': true | undefined;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onPointerEnter: (event: React.PointerEvent<HTMLElement>) => void;
}

export interface UseMenuCommandOptions {
  /**
   * Focusable but not activatable, which is what a menu means by disabled: the
   * arrows walk onto it like any other row, because with `role="menu"` a screen
   * reader is in focus mode and a command the arrows skip is one its user is
   * never told about.
   */
  disabled?: boolean;
  /** What typing matches, when the row's own name is not what to match. */
  textValue?: string;
  /**
   * Whether choosing the row closes the menu. `true` by default, which is the
   * APG's rule — a command runs and the menu goes.
   *
   * A SEPARATE switch, and not `event.preventDefault()`, which is how a
   * `<button>` row says the same thing. On a checkable row the focusable
   * element is a real `<input>`, and preventing the default there cancels the
   * PLATFORM's activation behaviour: the tick would not move. One signal
   * cannot mean "do not close" on one row and "do not toggle" on another.
   */
  closeOnSelect?: boolean;
}

export interface UseMenuCommandResult {
  /** Resolved to a boolean, for the row that has to draw itself inert. */
  disabled: boolean;
  /**
   * Put this on the focusable element, merged with the consumer's own ref.
   *
   * Handed back on its own rather than through the getter below, because
   * passing a ref INTO a function call during render counts as reading it, and
   * the React Compiler stops the build over it — measured, and the same reason
   * `useDescendants` hands out a callback ref rather than a ref object.
   */
  ref: RefCallback<HTMLElement>;
  /**
   * A GETTER, not a collection: it merges what you pass in, so the consumer's
   * own handlers and ref compose with the menu's wiring instead of one
   * clobbering the other.
   */
  getCommandProps: <P extends object>(props?: P) => P & MenuCommandProps;
}
