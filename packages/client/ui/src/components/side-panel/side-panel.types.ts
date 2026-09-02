import type { ComponentPropsWithRef, ReactNode } from 'react';

interface SidePanelOwnProps {
  /**
   * What this panel is, in a word or two — "Preview", "Filters", "Details".
   *
   * Required, and not a nicety: `<aside>` is a landmark, so a page with two
   * unnamed ones offers a screen reader user a list of things all called
   * "complementary". The same reason `Nav` requires one.
   *
   * Pass `aria-labelledby` instead — pointing at a heading you already show —
   * and it wins, because a name from `aria-labelledby` outranks one from
   * `aria-label`. Prefer that whenever the panel has a visible title: then the
   * words announced are the words on screen.
   */
  label: string;
  children?: ReactNode;
}

/**
 * A surface BESIDE the content, which the content is still usable behind —
 * see [ADR-0034]. Everything it does not consume reaches the `<aside>`.
 *
 * There is no `open` prop, and that is the decision rather than an omission:
 * whether a panel exists right now is the app's state, and the app renders one
 * or does not. A prop would put that state in two places and make the closed
 * panel a thing in the DOM. Where an app can, it should keep the answer in its
 * URL — linkable, survives a reload, correct with no JavaScript.
 *
 * No `side` either. A panel takes the column the layout gives it, and which
 * side that is is the grid's business; `Dialog`'s `side` exists because a modal
 * has no column to be given.
 */
export type SidePanelProps = SidePanelOwnProps &
  Omit<ComponentPropsWithRef<'aside'>, keyof SidePanelOwnProps>;
