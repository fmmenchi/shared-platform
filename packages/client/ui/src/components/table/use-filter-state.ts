import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { activeFilters } from '../../filtering/filter.js';
import type { FilterState } from '../../filtering/filter.types.js';
import type {
  UseFilterStateOptions,
  UseFilterStateResult,
} from './use-filter-state.types.js';

/** Nothing filtered. Shared, because an empty set has no identity worth having. */
const NO_FILTERS: FilterState = Object.freeze({});

/**
 * Which columns are filtered, and to what. The primitive under
 * `useTableFilters` — state only, no engine.
 *
 * FILTERS ARE A PROJECTION PARAMETER, like the sort and unlike the selection.
 * They decide which rows EXIST, so they belong in a query key and in a URL:
 * a reader who filtered and reloaded expects the same twelve rows. That is why
 * the state is plain strings and why this hook exists apart from the engine —
 * a consumer whose server filters takes this one and the matching never enters
 * their bundle.
 *
 * IT REPORTS AN APPLICATION, NOT A KEYSTROKE. `onFilterApply` is the moment a
 * draft becomes the view, and the editor holds the draft until then. Filtering
 * as the reader types deletes rows under them continuously — the same silent
 * change sorting had, at a higher rate — and it gives the live region nothing
 * discrete to announce.
 */
export function useFilterState(
  options: UseFilterStateOptions = {},
): UseFilterStateResult {
  const { filters, defaultFilters, onFiltersChange } = options;

  const controlled = 'filters' in options;

  const [state, setState] = useControlled<FilterState>({
    value: controlled ? (filters ?? NO_FILTERS) : undefined,
    defaultValue: defaultFilters ?? NO_FILTERS,
    onChange: onFiltersChange,
    name: 'useFilterState',
  });

  useDevWarning(
    controlled && !onFiltersChange,
    'useFilterState: `filters` is passed but `onFiltersChange` is not, so nothing can ever be filtered and every filter control is inert. Pass both, or pass `defaultFilters` and let the hook hold it.',
  );

  return {
    state,
    active: activeFilters(state),
    setFilters: (next) => setState(next),
    clearFilters: () => setState(NO_FILTERS),
    props: {
      filters: state,
      onFilterApply: (key, value) =>
        setState((previous) => {
          // A CLEARED BOX IS NOT A FILTER THAT MATCHES NOTHING — it is no
          // filter, so the key leaves rather than sitting there empty. It
          // matters beyond tidiness: this object is a query key, and
          // `{ city: '' }` and `{}` are two cache entries for one view.
          const next = { ...previous };
          if (value.trim() === '') delete next[key];
          else next[key] = value;
          return next;
        }),
    },
  };
}
