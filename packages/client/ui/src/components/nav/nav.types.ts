import type { ComponentPropsWithRef } from 'react';
import type { NavOrientation } from './nav.context.js';

export interface NavProps extends ComponentPropsWithRef<'nav'> {
  /**
   * What this navigation is, in a word or two — "Main", "In this section".
   *
   * Required, and not a nicety: a page with more than one navigation landmark
   * gives a screen reader user a list of them all called "navigation". It is
   * the one thing only you can supply.
   *
   * Pass `aria-labelledby` instead — pointing at a heading you already show —
   * and it wins: it is rendered after this one and outranks it anyway.
   */
  label: string;
  /**
   * `'horizontal'` (default) — a bar, where a group opens as a flyout over the
   * page. The flyout is a `popover`, so the platform dismisses it: on a click
   * outside, on `Escape` from anywhere, and when another group opens. At most
   * one is ever open and nothing of ours arbitrates that.
   *
   * `'vertical'` — a sidebar, where a group opens IN PLACE and indented: as
   * many as the reader opened, and none of them closes on its own. Shutting one
   * section to open another loses the place they were keeping, and a block of
   * the page does not take `Escape` off whatever it is sitting in.
   */
  orientation?: NavOrientation;
}
