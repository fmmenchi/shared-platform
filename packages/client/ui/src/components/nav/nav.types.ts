import type { ComponentPropsWithRef } from 'react';
import type { NavOrientation } from './nav.context.js';

export interface NavProps extends ComponentPropsWithRef<'nav'> {
  /**
   * What this navigation is, in a word or two — "Main", "In this section".
   *
   * Required, and not a nicety: a page with more than one navigation landmark
   * gives a screen reader user a list of them all called "navigation". It is
   * the one thing only you can supply.
   */
  label: string;
  /**
   * `'horizontal'` (default) — a bar, where a group opens as a flyout over the
   * page: at most one at a time, and it closes when the focus leaves.
   *
   * `'vertical'` — a sidebar, where a group opens IN PLACE and indented: as
   * many as the reader opened, and none of them closes on its own. Shutting one
   * section to open another loses the place they were keeping.
   */
  orientation?: NavOrientation;
}
