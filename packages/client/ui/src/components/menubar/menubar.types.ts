import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { MenubarOrientation } from '../menu/menu.context.js';

export interface MenubarProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /**
   * What this bar is, in a word or two — "Editor", "Document".
   *
   * Required, and not a nicety: a screen reader announces "menu bar" and a page
   * with two of them gives its user two entries by the same name. It is the one
   * thing only you can supply.
   */
  label: string;
  /**
   * `'horizontal'` (default) — the commands sit side by side, the inline arrows
   * walk them, and a menu opens BELOW its command: Down opens it at the first
   * entry and Up at the last.
   *
   * `'vertical'` — the commands sit above one another, Up and Down walk them,
   * and a menu opens BESIDE its command on the inline-end side, like a submenu.
   */
  orientation?: MenubarOrientation;
  /** The menus on the bar — a `Menu` each, triggered by a `MenuItemTrigger`. */
  children: ReactNode;
}
