import type { TableCellProps } from './table-cell.types.js';

/**
 * One cell. A `<td>`.
 *
 * `align` becomes a data attribute rather than a class, for the reason
 * `Toolbar` and `Tabs` already record about `data-orientation`: it is the hook
 * a consumer's own stylesheet can read, and a hashed class from a CSS module is
 * not nameable from theirs.
 */
function TableCell(props: TableCellProps) {
  const { align, children, ...rest } = props;

  return (
    <td {...rest} data-align={align}>
      {children}
    </td>
  );
}

export { TableCell };
