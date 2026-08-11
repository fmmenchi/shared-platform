import { TableSectionContext } from '../table/table.context.js';
import type { TableBodyProps } from './table-body.types.js';

/**
 * The rows — a `<tbody>`, and the section that makes a `TableHeaderCell` inside
 * it a ROW header rather than a column one.
 */
function TableBody(props: TableBodyProps) {
  const { children, ...rest } = props;

  return (
    <TableSectionContext.Provider value="body">
      <tbody {...rest}>{children}</tbody>
    </TableSectionContext.Provider>
  );
}

export { TableBody };
