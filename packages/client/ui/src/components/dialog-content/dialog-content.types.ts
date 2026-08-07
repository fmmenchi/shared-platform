import type { ComponentPropsWithRef } from 'react';

/**
 * The dialog itself: a native `<dialog>`, and what it is given goes to the
 * element — including `closedby`, so a modal holding unfinished work can ask
 * for `closerequest` and refuse a stray backdrop click.
 *
 * The `id` is the exception, and it is owned by the component: the trigger's
 * `commandfor` points at it, so one passed here would cut that wire. It is
 * ignored.
 */
export type DialogContentProps = ComponentPropsWithRef<'dialog'> & {
  /**
   * Pin the surface to an EDGE instead of centring it — a drawer.
   *
   * It is the same modal and not a second component: `showModal()` traps the
   * focus, makes the page inert, draws the backdrop, locks the scroll and hands
   * the focus back, all of which a drawer wants unchanged. What differs is
   * geometry, so this is geometry.
   *
   * LOGICAL edges: `'inline-start'` is the left in English and the right in
   * Arabic, and the panel slides in from the side it is pinned to either way.
   *
   * A drawer usually shows no heading — a navigation one is a list of links —
   * so give it a name with `aria-label`; a `<dialog>` with no accessible name
   * is announced as just "dialog".
   */
  side?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
};
