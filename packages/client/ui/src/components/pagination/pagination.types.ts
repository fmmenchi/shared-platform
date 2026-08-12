import type { ComponentPropsWithRef } from 'react';

interface PaginationBase extends Omit<
  ComponentPropsWithRef<'nav'>,
  'children' | 'onChange' | 'onPageChange'
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
  /**
   * How many pages to draw on each side of the current one.
   *
   * The list's LENGTH does not change with it: the ends expand to fill in for
   * the gap that is not needed there, and a gap is drawn as wide as the page it
   * stands in for — so Next is in the same place on every page and does not
   * move under the pointer between clicks. The number of STOPS does change by
   * one when a gap opens, which is inherent to having gaps at all.
   *
   * @default 1
   */
  siblingCount?: number;
  /**
   * What this navigation is called. A page can have more than one — a list and
   * its comments — and two landmarks called "Pagination" are two identical
   * entries in a screen reader's list.
   *
   * An `aria-label` or `aria-labelledby` of your own wins over it and over the
   * default, rather than being quietly overwritten.
   */
  label?: string;
}

/**
 * Either the pages are addresses or they are state, and the props say which.
 *
 * `onPageChange` is REFUSED alongside `getHref` rather than ignored: with links
 * the browser navigates and nothing here would ever call it, so a required
 * callback that can never fire is a promise the type should not let you make.
 * Note what that means for a client router — see `getHref`.
 */
export type PaginationProps = PaginationBase &
  (
    | {
        /**
         * Makes the pages LINKS by saying where each one lives.
         *
         * Pass it when the page is part of the address: the reader can then
         * open one in a new tab, bookmark it, and reach it with the browser's
         * own back button — none of which a button offers.
         *
         * IT IS A REAL NAVIGATION. There is no render slot for a router's own
         * `Link`, so in a single-page app these load the document: use the
         * button form and let your router push the page, or wrap this
         * component with one that renders your `Link`.
         */
        getHref: (page: number) => string;
        onPageChange?: never;
      }
    | {
        getHref?: never;
        /** The reader asked for another page. Receives the page, not a delta. */
        onPageChange: (page: number) => void;
      }
  );
