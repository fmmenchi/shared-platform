export interface UsePaginationStateOptions {
  /**
   * How many rows there are IN ALL — not on this page. It is what turns a page
   * number into "page 3 of 40", and only the side that ran the query knows it.
   */
  total: number;
  /**
   * Controlled: you hold the page. Read by PRESENCE, not by value, so passing
   * `undefined` is controlled-and-on-page-one rather than uncontrolled.
   */
  page?: number;
  /** Uncontrolled seed — a page restored from a URL. @default 1 */
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** Controlled page size, read by presence for the same reason. */
  pageSize?: number;
  /** @default 20 */
  defaultPageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface UsePaginationStateResult {
  /** The page in force, clamped into the range the total allows. */
  page: number;
  pageSize: number;
  /** How many pages the total makes. Zero rows is zero pages. */
  pageCount: number;
  /** The rows this page covers, counting from 1 — for "21–40 of 800". */
  range: { from: number; to: number };
  setPage: (page: number) => void;
  /**
   * Change how many rows a page holds. It moves the reader to the page holding
   * the row they were looking at, rather than to page one — see the hook.
   */
  setPageSize: (pageSize: number) => void;
  /** Spread onto `Table`, or onto `Pagination` directly. */
  props: {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
  };
}

export type UsePaginationOptions = Omit<UsePaginationStateOptions, 'total'>;

export interface UsePaginationResult<T> extends UsePaginationStateResult {
  /** The rows of this page. */
  rows: readonly T[];
}
