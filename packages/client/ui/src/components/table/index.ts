export { Table } from './table.component.js';
export type {
  TableProps,
  Column,
  TableAlign,
  TableDensity,
} from './table.types.js';
export { useSortState, nextSort } from './use-sort-state.js';
export type {
  UseSortStateOptions,
  UseSortStateResult,
} from './use-sort-state.types.js';
export { useTableSort } from './use-table-sort.js';
export type {
  UseTableSortOptions,
  UseTableSortResult,
} from './use-table-sort.types.js';
export { useRowSelection } from './use-row-selection.js';
export type {
  UseRowSelectionOptions,
  UseRowSelectionResult,
} from './use-row-selection.types.js';
// The rule, and the algebra over it. `Table` reports selection INTENTS exactly
// as it reports `onSortToggle`, so a consumer holding the state themselves
// needs the transitions for the same reason `nextSort` is public — and the
// two-mode reading is precisely what this file says nobody should rewrite by
// hand. `EVERYTHING_SELECTED` is "all 10,000 matching", the affordance only the
// side that knows the result set's size can offer.
export {
  NOTHING_SELECTED,
  EVERYTHING_SELECTED,
  isRowSelected,
  countSelected,
  coverageOf,
  toggleRow,
  toggleRows,
} from '../../selection/selection.js';
export type {
  Selection,
  SelectionCoverage,
} from '../../selection/selection.types.js';
export type {
  SortState,
  SortDirection,
  Comparator,
} from '../../sorting/compare.types.js';
export { useFilterState } from './use-filter-state.js';
export type {
  UseFilterStateOptions,
  UseFilterStateResult,
} from './use-filter-state.types.js';
export { useTableFilters } from './use-table-filters.js';
export type {
  UseTableFiltersOptions,
  UseTableFiltersResult,
} from './use-table-filters.types.js';
export type { FilterState, RowFilter } from '../../filtering/filter.types.js';
export { useColumnWidths } from './use-column-widths.js';
export type {
  ColumnWidths,
  UseColumnWidthsOptions,
  UseColumnWidthsResult,
} from './use-column-widths.types.js';
export { useRowExpansion } from './use-row-expansion.js';
export type {
  ExpandedRows,
  UseRowExpansionOptions,
  UseRowExpansionResult,
} from './use-row-expansion.types.js';

// The subpath barrel had drifted from the root one, which re-exports from the
// leaf files directly: a consumer on `@fmmenchi/ui/table` — the entry the build
// doc pushes for tree-shaking — could not reach column visibility at all and
// had to pull the root barrel back in for one hook.
export { useColumnVisibility } from './use-column-visibility.js';
export type {
  HiddenColumns,
  UseColumnVisibilityOptions,
  UseColumnVisibilityResult,
} from './use-column-visibility.types.js';
export type { TableRowAttributes } from './table.types.js';
export { useColumnOrder, moveColumn } from './use-column-order.js';
export type {
  ColumnOrder,
  UseColumnOrderOptions,
  UseColumnOrderResult,
} from './use-column-order.types.js';
