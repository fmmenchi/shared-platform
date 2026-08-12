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
 *
 * Two consequences of that, stated because both are visible from outside. A
 * CONTROLLED consumer can hold a page this returns a different number for —
 * their URL says 8 while the pager shows 2 — and nothing reconciles them,
 * because reconciling would mean writing to their state without being asked.
 * And changing the page size is NOT reversible: the anchor is the top of the
 * page you were on, so 20-per-page on page 8 is row 141, and going to 50 and
 * back to 20 lands on page 6 rather than 8. Remembering the exact row would
 * take state nobody asked this hook to hold.
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
  // `NaN` IS NOT A PAGE, and the clamp does not remove it: `Math.min(Math.max(
  // NaN, 1), n)` is `NaN`, which then reached the pager as a page nothing
  // matched — no control marked as current, both steps live, and Next
  // reporting `NaN + 1` forever. The shape that produces it is the one this
  // hook's own doc names: `parseInt(params.get('page') ?? '', 10)`.
  const wanted = Number.isFinite(rawPage) ? Math.round(rawPage) : 1;
  const current =
    pageCount === 0 ? 1 : Math.min(Math.max(wanted, 1), pageCount);

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
      // sending them to page 1 instead loses the place they had found — which
      // is what every table that does the other thing throws away.
      //
      // THE ANCHOR IS THE STORED PAGE, not the clamped one, and that is the
      // correction: reading `current` here wrote the clamped value back into
      // the state, so a reader whose filter had temporarily pinned them to
      // page 1 lost the page 8 they would otherwise have returned to. The
      // whole point of clamping on READ is that the state survives.
      //
      // FUNCTIONAL, because `size` is state too: two calls in one handler both
      // read the render's value, and measured, that landed two sizes away from
      // where one call would have.
      if (!Number.isFinite(next) || next <= 0) return;
      setRawPage((previous) => {
        const from = Number.isFinite(previous) ? Math.max(previous, 1) : 1;
        return Math.floor(((from - 1) * size) / next) + 1;
      });
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
