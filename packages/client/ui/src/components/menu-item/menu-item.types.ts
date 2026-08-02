import type { ComponentPropsWithRef } from 'react';

/**
 * One command in the menu. A `<button>`, with everything a button takes.
 *
 * `disabled` uses the NATIVE attribute, and that is deliberate: a disabled item
 * is skipped by the arrows and by typeahead, but it stays in the reading order
 * so a screen reader user still learns the command exists.
 */
export type MenuItemProps = ComponentPropsWithRef<'button'>;
