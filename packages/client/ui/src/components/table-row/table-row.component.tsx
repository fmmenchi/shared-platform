import type { TableRowProps } from './table-row.types.js';

/**
 * One row. A `<tr>`, and nothing it does not need.
 *
 * No stylesheet of its own: the family's rules live in `table.module.css` and
 * reach here by element selector. A part reaching into another folder's
 * stylesheet is what ADR-0019 forbids; having none is not the same thing.
 */
function TableRow(props: TableRowProps) {
  const { children, ...rest } = props;

  return <tr {...rest}>{children}</tr>;
}

export { TableRow };
