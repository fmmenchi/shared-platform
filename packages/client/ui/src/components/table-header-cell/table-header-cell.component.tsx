import { cn } from '../../util/cn.js';
import { useTableSection } from '../table/table.context.js';
import type { TableHeaderCellProps } from './table-header-cell.types.js';
import styles from '../table/table.module.css';

/**
 * A header cell — `<th>`, with the one attribute that decides whether the table
 * is readable.
 *
 * `scope` IS DERIVED FROM POSITION, not configured: a `<th>` in the header
 * section heads a column, the same element in the body heads a row. That is
 * what the two positions mean, so it can be read off the section rather than
 * remembered — and `scope` is the most consequential attribute in a table and
 * the most omitted. Without it a reader landing on a cell hears "Rossi" instead
 * of "Nome: Rossi".
 *
 * It can still be overridden: `colgroup` and `rowgroup` exist for header cells
 * that span, and only the author knows about those.
 */
function TableHeaderCell(props: TableHeaderCellProps) {
  const { align, scope, className, children, ...rest } = props;
  const section = useTableSection();

  return (
    <th
      {...rest}
      scope={scope ?? (section === 'head' ? 'col' : 'row')}
      data-align={align}
      className={cn(styles.headerCell, className)}
    >
      {children}
    </th>
  );
}

export { TableHeaderCell };
