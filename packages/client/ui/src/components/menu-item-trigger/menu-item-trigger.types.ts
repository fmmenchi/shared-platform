import type { ComponentPropsWithRef } from 'react';

/**
 * The command that opens a submenu. A `<button>`, like every other command,
 * with everything a button takes.
 *
 * It has no `onClick` worth giving it: choosing it opens the menu it belongs
 * to, which is the platform's job through `popovertarget`. `disabled` works as
 * it does on any command — `aria-disabled`, focusable and inert — and an inert
 * one does not open.
 */
export type MenuItemTriggerProps = ComponentPropsWithRef<'button'> & {
  /**
   * What typing on the keyboard should match, when the command's own name is
   * not it. Same rule as `MenuItem`: it must be text the user can read.
   */
  textValue?: string;
};
