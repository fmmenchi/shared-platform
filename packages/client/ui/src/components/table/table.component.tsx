import { useState, type ReactNode } from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useMessages } from '../../i18n/provider.js';
import { Button } from '../button/button.component.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { SortArrow } from './sort-arrow.component.js';
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
    sort,
    onSortToggle,
    ...rest
  } = props;

  const t = useMessages(tableMessages);

  // WHETHER THE READER HAS ASKED FOR ANYTHING YET, and the only reason `Table`
  // holds any state at all. The live region must be silent on mount — a table
  // rendered with `defaultSortKey` is already sorted, and announcing that on
  // arrival is a sentence from nowhere — and must speak on every change after.
  // A ref cannot answer it: the Rules of React forbid reading one during
  // render, which is exactly when the announcement is built.
  const [activated, setActivated] = useState(false);

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

  // The column can be ordered only when BOTH are true, and the header renders
  // plain otherwise: a control that reports an intent nobody listens to is a
  // dead button, so it is not drawn at all.
  const sorts = columns?.some((column) => column.sortable) === true;
  const wired = sorts && Boolean(onSortToggle);

  useDevWarning(
    sorts && !onSortToggle,
    'Table: a column is marked `sortable` but nothing is wired to `onSortToggle`, so the mark is ignored and the header renders as plain text. Pass the props from `useTableSort` (or `useSortState`, if something else does the ordering).',
  );

  const sortedColumn = columns?.find((column) => column.key === sort?.key);

  // A `sort` naming no column is the shape a persisted state arrives in after
  // somebody renames a column: nothing carries `aria-sort`, nothing is
  // announced, and the table looks and sounds unsorted while the state says
  // otherwise. Silence is the worst of the three possible answers.
  useDevWarning(
    Boolean(columns && sort && !sortedColumn),
    `Table: \`sort\` names the column \`${String(sort?.key)}\`, which is not in \`columns\` — so no header claims it and nothing is announced. A key that outlived the column list usually comes from a URL or storage.`,
  );

  useDevWarning(
    sortedColumn !== undefined &&
      sortedColumn.sortLabel === undefined &&
      typeof sortedColumn.header !== 'string',
    'Table: the sorted column has a `header` that is not a string, so the announcement falls back to its `key` — a developer identifier, untranslated, read out inside localized copy. Give the column a `sortLabel`.',
  );

  // ANNOUNCED BY RENDERING, not by an effect. The region is always in the tree
  // and only its text changes, which is the reliable path.
  //
  // ALL THREE STOPS SPEAK. The cleared stop used to render `''`, and emptying a
  // live region announces NOTHING: `role="status"` implies
  // `aria-relevant="additions text"`, so a removal is not in the relevant set.
  // The one stop the design argues hardest for — back to the order the data
  // arrived in — was the one nobody was told about.
  const announcement = !activated
    ? ''
    : sort && sortedColumn
      ? t(sort.direction === 'asc' ? 'sortedAscending' : 'sortedDescending', {
          column:
            sortedColumn.sortLabel ??
            (typeof sortedColumn.header === 'string'
              ? sortedColumn.header
              : sortedColumn.key),
        })
      : t('sortCleared');

  return (
    <>
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
                {columns.map((column) => {
                  const active = sort?.key === column.key;
                  const canSort = column.sortable === true && onSortToggle;

                  return (
                    <TableHeaderCell
                      key={column.key}
                      align={column.align}
                      // THE STATE OF THE DATA, and separately the invitation.
                      // `ascending`/`descending` is not gated on `sortable`:
                      // rows that arrive ordered ARE ordered, and a read-only
                      // server-sorted column should say so. `none` is the other
                      // half, and the first version was wrong to leave it out —
                      // the argument was "the button already tells them", and
                      // it does not: the button's accessible name is the column
                      // heading, and the only thing marking the column as
                      // orderable was a glyph carrying `aria-hidden`. `none` is
                      // what the attribute has that value for.
                      aria-sort={
                        active
                          ? sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : canSort
                            ? 'none'
                            : undefined
                      }
                    >
                      {canSort ? (
                        // OUR Button, not a hand-rolled `<button>`. `NavGroup`
                        // wrote its own once — `border: 0; background: none`, the
                        // first two lines of what `button.module.css` does — and
                        // shipped with no focus ring at all, invisible to every
                        // test because the test page has no Preflight.
                        <Button
                          variant="ghost"
                          size="sm"
                          className={styles.sortTrigger}
                          onClick={() => {
                            // The KEY, not the next state. The transition is
                            // computed by whoever owns the state and can read
                            // its latest value; computed here it came from the
                            // `sort` prop of the render that drew this arrow,
                            // which a consumer committing in a transition has
                            // not refreshed — two clicks then landed on
                            // ascending twice.
                            setActivated(true);
                            onSortToggle(column.key);
                          }}
                        >
                          {column.header}
                          <SortArrow
                            direction={active ? sort.direction : undefined}
                          />
                        </Button>
                      ) : (
                        column.header
                      )}
                    </TableHeaderCell>
                  );
                })}
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

      {/* ONLY WHERE IT CAN SPEAK. Rendered unconditionally it shipped a
        permanently-empty live region on every composed table and every table
        with nothing sortable — in composed mode `columns` is `never`, so the
        text it exists to carry could not be produced at all. An element is
        justified by something it does that the alternative cannot (ADR-0016),
        and the cost of one that does nothing is paid per table, per page.

        OUTSIDE the table, because a `<span>` inside one is not legal markup and
        the parser would reparent it — and outside the `<caption>` especially,
        since the caption IS the accessible name and this text would join it.
        A fragment rather than a wrapper element: `Button` reached the same
        shape for the same reason.

        The data attribute is an ADDRESS, not a hook for styling: `Button`
        already carries a `role="status"` region of its own for its pending
        state, so a table with sortable headers has one per header plus this.
        They are all empty at rest and harmless, but "the status region" stops
        being a thing you can point at, and a test — or a consumer — needs to
        name which one it means. */}
      {wired && (
        <VisuallyHidden role="status" data-table-status="">
          {announcement}
        </VisuallyHidden>
      )}
    </>
  );
}

export { Table };
