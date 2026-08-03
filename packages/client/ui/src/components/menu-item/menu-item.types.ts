import type { ComponentPropsWithRef } from 'react';

/**
 * One command in the menu. A `<button>`, with everything a button takes.
 *
 * `disabled` does NOT use the native attribute, and that is deliberate: the
 * command is `aria-disabled` and stays focusable, so the arrows and typing
 * reach it and it announces itself — it simply cannot be run. The APG asks for
 * this ("disabled menu items are focusable but cannot be activated") because
 * `role="menu"` puts a screen reader into focus mode, where the arrows are the
 * only way through and a natively disabled item is skipped by them: the user
 * would never be told the command exists.
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
