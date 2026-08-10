import type { ReactNode } from 'react';
import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { TableBody } from '../table-body/table-body.component.js';
import { TableCell } from '../table-cell/table-cell.component.js';
import { TableHead } from '../table-head/table-head.component.js';
import { TableHeaderCell } from '../table-header-cell/table-header-cell.component.js';
import { TableRow } from '../table-row/table-row.component.js';
import type { Column, TableAnyProps, TableProps } from './table.types.js';
import styles from './table.module.css';

/**
 * Rows and columns, announced correctly.
 *
 * A `<table>` is already among the best-supported things in HTML: a screen
 * reader announces its size on entry and, as the reader moves, the column
 * header across and the row header down. All of that is free — and all of it
 * depends on markup the average table gets wrong. So:
 *
 *     WE ARE NOT ADDING ACCESSIBILITY TO A TABLE.
 *     WE ARE PREVENTING ITS REMOVAL.
 *
 * Which is why `scope`, the accessible name and the empty row's `colSpan` are
 * not opt-in. Behind a prop they would be absent from most tables, and the
 * component would be delivering less than raw HTML already offered.
 *
 * THE COLUMNS ARE DATA, and that is the decision everything else rests on. It
 * is not a style preference: it is the only way to GUARANTEE the invariants
 * that run across a row rather than watch for them. Given JSX a caller can
 * write four header cells and five body cells, and every value is then
 * attributed to the wrong column — invisible to anyone looking at the screen.
 * Here both come from one list.
 *
 * IT NEVER SEES WHERE THE ROWS CAME FROM, and cannot: they arrive as an array,
 * and an array does not say whether a `.sort()` or an `ORDER BY` produced it.
 * The agnosticism is not discipline, it is an absence of information.
 *
 * NOT A GRID. Cells here are content: they may CONTAIN controls, but nothing
 * moves focus between them. `role="grid"` takes the arrow keys away from the
 * assistive technology and promises a full two-dimensional keyboard in return;
 * a table with a matrix of inputs needs that, and it is a different component.
 */
function Table<T>(props: TableProps<T>) {
  const {
    caption,
    density,
    busy,
    className,
    columns,
    rows,
    getRowId,
    empty,
    children,
    ...rest
  } = props as TableAnyProps<T>;

  useDevWarning(
    caption === '' || caption === null || caption === undefined,
    'Table: `caption` is empty. Assistive technology lists the tables on a page, and without a name they are identical entries. Use `VisuallyHidden` if the design has no room for it.',
  );

  return (
    <table
      {...rest}
      aria-busy={busy || undefined}
      data-density={density}
      className={cn(styles.table, className)}
    >
      {/* First child, as the parser requires — and a real `<caption>` rather
          than an `aria-label`, so it is announced AND readable. */}
      <caption className={styles.caption}>{caption}</caption>
      {columns && rows && getRowId ? (
        <Generated
          columns={columns}
          rows={rows}
          getRowId={getRowId}
          empty={empty}
        />
      ) : (
        children
      )}
    </table>
  );
}

/**
 * The column model rendered. Split out so `Table` itself stays the shell that
 * both modes share — the caption, the busy state and the density belong to the
 * element either way.
 */
function Generated<T>(props: {
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string;
  empty?: ReactNode;
}) {
  const { columns, rows, getRowId, empty } = props;

  return (
    <>
      {/* One `<col>` per column, from the same list the cells come from. It is
          where widths belong, and having it from the start is what keeps a
          later resize from being a retrofit. */}
      <colgroup>
        {columns.map((column) => (
          <col key={column.key} />
        ))}
      </colgroup>

      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableHeaderCell key={column.key} align={column.align}>
              {column.header}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {rows.length === 0 && empty !== undefined ? (
          <TableRow>
            {/* COUNTED, not typed. A hand-written number is wrong the day a
                column is added, and a short `colSpan` leaves the empty message
                sitting under one column instead of across the table. */}
            <TableCell colSpan={columns.length} className={styles.empty}>
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((column) => {
                const content = column.cell
                  ? column.cell(row)
                  : ((row as Record<string, unknown>)[column.key] as ReactNode);

                return column.rowHeader ? (
                  <TableHeaderCell key={column.key} align={column.align}>
                    {content}
                  </TableHeaderCell>
                ) : (
                  <TableCell key={column.key} align={column.align}>
                    {content}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </>
  );
}

export { Table };
