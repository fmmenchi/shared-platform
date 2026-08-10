import { cn } from '../../util/cn.js';
import type { TableRowProps } from './table-row.types.js';
import styles from '../table/table.module.css';

/** One row. A `<tr>`, and nothing it does not need. */
function TableRow(props: TableRowProps) {
  const { className, children, ...rest } = props;

  return (
    <tr {...rest} className={cn(styles.row, className)}>
      {children}
    </tr>
  );
}

export { TableRow };
