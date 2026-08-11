import { TableSectionContext } from '../table/table.context.js';
import type { TableFootProps } from './table-foot.types.js';

/**
 * The summary section — a `<tfoot>`, for the totals row.
 *
 * It exists because the docs already sent people here: a totals footer is one
 * of the three layouts named as the reason the composed parts are exported, and
 * without this part the recipe was a raw `<tfoot>` — outside any section, where
 * `TableHeaderCell` cannot tell what its cells head. The section union had
 * declared `'foot'` from the start with nothing to produce it.
 *
 * A `<th>` in here heads a COLUMN, like one in the header: a totals row's label
 * cell describes the column above it, not the row beside it.
 */
function TableFoot(props: TableFootProps) {
  const { children, ...rest } = props;

  return (
    <TableSectionContext.Provider value="foot">
      <tfoot {...rest}>{children}</tfoot>
    </TableSectionContext.Provider>
  );
}

export { TableFoot };
