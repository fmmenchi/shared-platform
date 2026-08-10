import { cn } from '../../util/cn.js';
import type { TableCellProps } from './table-cell.types.js';
import styles from '../table/table.module.css';

/**
 * One cell. A `<td>`.
 *
 * `align` becomes a data attribute rather than a class, for the reason
 * `Toolbar` and `Tabs` already record about `data-orientation`: it is the hook
 * a consumer's own stylesheet can read, and a hashed class from a CSS module is
 * not nameable from theirs.
 */
function TableCell(props: TableCellProps) {
  const { align, className, children, ...rest } = props;

  return (
    <td {...rest} data-align={align} className={cn(styles.cell, className)}>
      {children}
    </td>
  );
}

export { TableCell };
