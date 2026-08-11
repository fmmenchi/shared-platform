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
 * A `<th>` in here heads its ROW: "Totale" describes the values beside it, so
 * the reader hears "Totale: 123" on the cell — `scope` can only point at
 * subsequent cells, and below a footer there are none for `col` to name.
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
