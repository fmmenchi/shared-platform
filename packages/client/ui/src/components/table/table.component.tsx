import type { ReactNode } from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useMessages } from '../../i18n/provider.js';
import { TableBody } from '../table-body/table-body.component.js';
import { TableCell } from '../table-cell/table-cell.component.js';
import { TableHead } from '../table-head/table-head.component.js';
import { TableHeaderCell } from '../table-header-cell/table-header-cell.component.js';
import { TableRow } from '../table-row/table-row.component.js';
import { tableMessages } from './table.messages.js';
import type { TableProps } from './table.types.js';
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
 * Which is why `scope`, the accessible name and the empty state are not opt-in.
 * Behind a prop they would be absent from most tables, and the component would
 * be delivering less than raw HTML already offered.
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
  } = props;

  const t = useMessages(tableMessages);

  // `hasRenderableChildren` rather than a null check, and the difference is the
  // shape a real call site writes: `caption={showIt && t('orders')}` passes
  // `false`, which is a legal ReactNode that renders NOTHING — the unnamed
  // table this prop exists to prevent, arriving through the one path the
  // simpler check could not see. Whitespace is the same story.
  useDevWarning(
    !hasRenderableChildren(caption),
    'Table: `caption` renders no text, so the table has no accessible name. Assistive technology lists the tables on a page, and unnamed ones are identical entries. Use `VisuallyHidden` if the design has no room for it.',
  );

  const keys = columns?.map((column) => column.key) ?? [];
  useDevWarning(
    new Set(keys).size !== keys.length,
    'Table: two columns share a `key`. It is the React key for the header and every body cell, so the rows reconcile unpredictably on the next sort — and nothing on screen says so.',
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
        <>
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
            {rows.length === 0 ? (
              <TableRow>
                {/* COUNTED, not typed. A hand-written number is wrong the day a
                    column is added, and a short `colSpan` leaves the message
                    sitting under one column instead of across the table. */}
                <TableCell
                  colSpan={Math.max(columns.length, 1)}
                  className={styles.empty}
                >
                  {hasRenderableChildren(empty) ? empty : t('empty')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((column) => {
                    const content = column.cell
                      ? column.cell(row)
                      : ((row as Record<string, unknown>)[
                          column.key
                        ] as ReactNode);

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
      ) : (
        children
      )}
    </table>
  );
}

export { Table };
