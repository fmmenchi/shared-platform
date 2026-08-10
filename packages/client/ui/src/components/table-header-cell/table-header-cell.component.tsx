import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useTableSection } from '../table/table.context.js';
import type { TableHeaderCellProps } from './table-header-cell.types.js';

/**
 * A header cell — `<th>`, with the one attribute that decides whether the table
 * is readable.
 *
 * `scope` IS DERIVED FROM POSITION: a `<th>` in a header section heads a
 * column, the same element in the body heads a row. That is what the two
 * positions mean, so it can be read off the section rather than remembered —
 * and `scope` is the most consequential attribute in a table and the most
 * omitted. Without it a reader landing on a cell hears "Rossi" instead of
 * "Nome: Rossi".
 *
 * WHERE THE POSITION IS UNKNOWN IT WRITES NOTHING, and that is the correction
 * that matters. There are three answers, not two: head, body, and "no section
 * around me at all". The first version folded the third into `row`, which is
 * not a guess but a LIE — with the attribute absent the browser's own
 * header-assignment algorithm works it out correctly (a row whose cells are all
 * `th` heads the columns), so asserting `row` there overwrites a right answer
 * with a wrong one and leaves the table with no column headers whatsoever.
 *
 * A SPANNING HEADER IS A GROUP. `colgroup`/`rowgroup` are not knowledge only
 * the author has — the span is a prop on the very element being rendered. A
 * two-level header whose top cell claimed plain `col` would attach the group's
 * label to its first column only, and every column under it would lose it.
 * Which is the case the docs send people to the composed parts FOR.
 */
function TableHeaderCell(props: TableHeaderCellProps) {
  const { align, scope, children, ...rest } = props;
  const section = useTableSection();

  const spansColumns = Number(rest.colSpan ?? 1) > 1;
  const spansRows = Number(rest.rowSpan ?? 1) > 1;

  const derived =
    section === 'head' || section === 'foot'
      ? spansColumns
        ? 'colgroup'
        : 'col'
      : section === 'body'
        ? spansRows
          ? 'rowgroup'
          : 'row'
        : undefined;

  // Not "you are misplaced" — it says the one thing the caller can act on.
  useDevWarning(
    section === null && scope === undefined,
    'TableHeaderCell: outside `TableHead`, `TableBody` or `TableFoot` there is no way to tell whether this heads a column or a row, so no `scope` is written and the browser is left to guess. Wrap the row in a section, or pass `scope` yourself.',
  );

  return (
    <th {...rest} scope={scope ?? derived} data-align={align}>
      {children}
    </th>
  );
}

export { TableHeaderCell };
