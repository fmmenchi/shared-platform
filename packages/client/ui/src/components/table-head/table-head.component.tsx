import { TableSectionContext } from '../table/table.context.js';
import type { TableHeadProps } from './table-head.types.js';

/**
 * The header section — a `<thead>`, and the reason a `TableHeaderCell` inside
 * it knows it heads a column.
 *
 * It provides the section rather than taking a prop for it, because the fact is
 * structural: a `<th>` here heads a COLUMN, the same `<th>` in the body heads a
 * ROW. Deriving `scope` from position means the attribute cannot be forgotten,
 * and forgetting it is what turns a table into a list of loose words.
 */
function TableHead(props: TableHeadProps) {
  const { children, ...rest } = props;

  return (
    <TableSectionContext.Provider value="head">
      <thead {...rest}>{children}</thead>
    </TableSectionContext.Provider>
  );
}

export { TableHead };
