import { cn } from '../../util/cn.js';
import { TableSectionContext } from '../table/table.context.js';
import type { TableBodyProps } from './table-body.types.js';
import styles from '../table/table.module.css';

/**
 * The rows — a `<tbody>`, and the section that makes a `TableHeaderCell` inside
 * it a ROW header rather than a column one.
 */
function TableBody(props: TableBodyProps) {
  const { className, children, ...rest } = props;

  return (
    <TableSectionContext.Provider value="body">
      <tbody {...rest} className={cn(styles.body, className)}>
        {children}
      </tbody>
    </TableSectionContext.Provider>
  );
}

export { TableBody };
