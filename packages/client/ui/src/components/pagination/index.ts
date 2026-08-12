export { Pagination } from './pagination.component.js';
export type { PaginationProps } from './pagination.types.js';
export { usePagination, usePaginationState } from './use-pagination.js';
export type {
  UsePaginationOptions,
  UsePaginationResult,
  UsePaginationStateOptions,
  UsePaginationStateResult,
} from './use-pagination.types.js';
// THE RANGE ITSELF, for a pager somebody draws differently. `sorting/` keeps
// its engine private and `filtering/` exports one function; this one is
// exported because a consumer building their own control needs the property the
// component is here for — a list whose length does not change as you page — and
// re-deriving it is how a second pager starts disagreeing with the first.
export { pageRange, pageCountOf } from '../../pagination/range.js';
export type {
  PageItem,
  PageRangeOptions,
} from '../../pagination/range.types.js';
