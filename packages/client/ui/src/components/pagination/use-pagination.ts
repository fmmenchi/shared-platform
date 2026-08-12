import { useMemo } from 'react';
import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { pageCountOf } from '../../pagination/range.js';
import type {
  UsePaginationOptions,
  UsePaginationResult,
  UsePaginationStateOptions,
  UsePaginationStateResult,
} from './use-pagination.types.js';

/**
 * Which page is showing, and how big a page is.
 *
 * A PROJECTION PARAMETER, like the sort and the filters and unlike the column
 * widths: it decides which rows exist for the reader, so it belongs in a query
 * key and in a URL. Somebody who paged to 3 and reloaded expects page 3.
 *
 * THE PAGE IS CLAMPED RATHER THAN TRUSTED. A page number arrives from a URL, a
 * back button or a stale link, and the data behind it moves — a filter applied
 * on page 8 of 40 leaves 2 pages and a reader staring at an empty table with
 * the pager insisting they are on page 8. Reading it clamped means the view is
 * always one that exists; the state is left alone, so a reader who removes the
 * filter is back where they were rather than on page 1.
 */
export function usePaginationState(
  options: UsePaginationStateOptions,
): UsePaginationStateResult {
  const {
    total,
    page,
    defaultPage,
    onPageChange,
    pageSize,
    defaultPageSize,
    onPageSizeChange,
  } = options;

  const pageControlled = 'page' in options;
  const sizeControlled = 'pageSize' in options;

  const [rawPage, setRawPage] = useControlled<number>({
    value: pageControlled ? (page ?? 1) : undefined,
    defaultValue: defaultPage ?? 1,
    onChange: onPageChange,
    name: 'usePaginationState',
  });

  const [size, setSize] = useControlled<number>({
    value: sizeControlled ? (pageSize ?? 20) : undefined,
    defaultValue: defaultPageSize ?? 20,
    onChange: onPageSizeChange,
    name: 'usePaginationState',
  });

  useDevWarning(
    pageControlled && !onPageChange,
    'usePaginationState: `page` is passed but `onPageChange` is not, so nothing can ever turn the page and every control is inert. Pass both, or pass `defaultPage` and let the hook hold it.',
  );

  useDevWarning(
    size <= 0,
    'usePaginationState: `pageSize` is zero or negative, so there are no pages and the pager renders nothing. It is the number of rows a page holds.',
  );

  const pageCount = pageCountOf(total, size);
  const current =
    pageCount === 0 ? 1 : Math.min(Math.max(rawPage, 1), pageCount);

  const from = pageCount === 0 ? 0 : (current - 1) * size + 1;
  const to = pageCount === 0 ? 0 : Math.min(current * size, total);

  return {
    page: current,
    pageSize: size,
    pageCount,
    range: { from, to },
    setPage: (next) => setRawPage(next),
    setPageSize: (next) => {
      // THE ROW THEY WERE LOOKING AT, not page one. Twenty per page on page 8
      // is row 141; asked for fifty per page, that row is on page 3, and
      // sending them to page 1 instead loses the place they had found. Measured
      // against every table that does the other thing: it is the one moment a
      // pager throws away the reader's position.
      const anchor = (current - 1) * size;
      setRawPage(next > 0 ? Math.floor(anchor / next) + 1 : 1);
      setSize(next);
    },
    props: {
      page: current,
      pageCount,
      onPageChange: (next) => setRawPage(next),
    },
  };
}

/**
 * `usePaginationState` plus the slicing: the rows of this page.
 *
 * THE ROWS GO TO THE HOOK, NOT TO THE COMPONENT — the shape sorting and
 * filtering both have. A consumer whose server paginates calls
 * `usePaginationState` instead and hands the page straight to their query,
 * which is most of why the two exist apart.
 */
export function usePagination<T>(
  rows: readonly T[],
  options: UsePaginationOptions = {},
): UsePaginationResult<T> {
  const state = usePaginationState({ ...options, total: rows.length });
  const { page, pageSize } = state;

  const sliced = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  return { ...state, rows: sliced };
}
