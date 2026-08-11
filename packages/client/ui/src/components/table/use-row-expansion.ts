import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import type {
  ExpandedRows,
  UseRowExpansionOptions,
  UseRowExpansionResult,
} from './use-row-expansion.types.js';

/** Nothing open. Shared, because an empty set has no identity worth having. */
const NONE: ExpandedRows = Object.freeze(new Set<string>());

/**
 * Which rows have their detail open.
 *
 * A SET OF IDS AND NOT A RULE, which is what separates this from the selection.
 * `useRowSelection` carries an `include`/`exclude` rule because "select all
 * 2,450 matching" is a thing a reader asks for; nobody asks to expand every row
 * of a result set they cannot see, and a page of open panels is a page nobody
 * can read. So the state is the ids, and the ids are the ones on screen.
 *
 * IT IS A VIEW PARAMETER, not a projection one: which rows exist does not
 * change, only how much of one is showing. It belongs in a URL when a row's
 * detail is worth linking to — and only then.
 */
export function useRowExpansion(
  options: UseRowExpansionOptions = {},
): UseRowExpansionResult {
  const { expanded, defaultExpanded, onExpandedChange } = options;

  const controlled = 'expanded' in options;

  const [state, setState] = useControlled<ExpandedRows>({
    value: controlled ? (expanded ?? NONE) : undefined,
    defaultValue: defaultExpanded ?? NONE,
    onChange: onExpandedChange,
    name: 'useRowExpansion',
  });

  useDevWarning(
    controlled && !onExpandedChange,
    'useRowExpansion: `expanded` is passed but `onExpandedChange` is not, so nothing can ever open and every control is inert. Pass both, or pass `defaultExpanded` and let the hook hold it.',
  );

  return {
    state,
    setExpanded: (next) => setState(next),
    collapseAll: () => setState(NONE),
    props: {
      expandedRows: state,
      onRowExpandToggle: (id) =>
        setState((previous) => {
          // A NEW SET EVERY TIME. Mutating and returning the same reference is
          // the shape that makes a controlled consumer's `useMemo` skip, and
          // the rows then stay as they were with the state saying otherwise.
          const next = new Set(previous);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    },
  };
}
