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
   * What typing on the keyboard should match.
   *
   * Typing matches the name the command is ANNOUNCED by — an `aria-label`, else
   * its text without what the accessibility tree ignores — so a decorative icon
   * costs nothing and this is rarely needed. Reach for it when the name starts
   * somewhere else: an icon carrying its own name, a badge, a visually-hidden
   * prefix. `<MenuItem textValue="Duplicate"><Badge>New</Badge> Duplicate</…>`
   * would otherwise answer to "n".
   *
   * It must be text the user can READ on the command. It reorders what typing
   * sees; it does not invent a keyword nobody can discover.
   */
  textValue?: string;
};
