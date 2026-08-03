import type { ComponentPropsWithRef } from 'react';

/**
 * One command in the menu. A `<button>`, with everything a button takes.
 *
 * `disabled` uses the NATIVE attribute, and that is deliberate: a disabled item
 * is skipped by the arrows and by typeahead, but it stays in the reading order
 * so a screen reader user still learns the command exists.
 */
export type MenuItemProps = ComponentPropsWithRef<'button'> & {
  /**
   * What typing on the keyboard should match, when the command's own text is
   * not it. Typeahead reads the item's text — which covers an icon, since an
   * `<svg>` contributes none — so this is only for a command whose markup puts
   * OTHER text first: `<MenuItem textValue="Duplicate"><Badge>New</Badge>
   * Duplicate</MenuItem>` would otherwise answer to "n".
   */
  textValue?: string;
};
