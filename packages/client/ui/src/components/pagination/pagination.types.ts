import type { ComponentPropsWithRef } from 'react';

export interface PaginationProps extends Omit<
  ComponentPropsWithRef<'nav'>,
  'children' | 'onChange'
> {
  /** Which page is showing, counting from 1. */
  page: number;
  /**
   * How many pages there are. ZERO renders nothing: "page 1 of 1" over an empty
   * list contradicts the empty message beside it, and one page needs no
   * navigation at all — so a pager appears exactly when there is somewhere else
   * to go.
   */
  pageCount: number;
  /** The reader asked for another page. Receives the page, not a delta. */
  onPageChange: (page: number) => void;
  /**
   * How many pages to draw on each side of the current one.
   *
   * The list's LENGTH does not change with it: the ends expand to fill in for
   * the gap that is not needed there, so the Next control stays where the
   * pointer left it and a keyboard reader's tab count is the same on every
   * page.
   *
   * @default 1
   */
  siblingCount?: number;
  /**
   * What this navigation is called. A page can have more than one — a list and
   * its comments — and two landmarks called "Pagination" are two identical
   * entries in a screen reader's list.
   */
  label?: string;
  /**
   * Makes the pages LINKS instead of buttons, by saying where each one lives.
   *
   * Pass it when the page is part of the address: the reader can then open one
   * in a new tab, bookmark it, and reach it with the browser's own back button
   * — none of which a button offers. Leave it out when the page is client
   * state and the URL does not move.
   */
  getHref?: (page: number) => string;
}
