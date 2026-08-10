import { useId, useState, type ReactNode } from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useMessages } from '../../i18n/provider.js';
import { Button } from '../button/button.component.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { coverageOf, isRowSelected } from '../../selection/selection.js';
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
 * SELECTION IS A RULE, NOT A LIST, and the checkbox column is drawn here
 * rather than written as a `cell` for the same reason `scope` is not a prop:
 * the part that goes wrong is not the box, it is what the box is CALLED. Five
 * controls named "Select row" are five controls a reader cannot tell apart, so
 * each is labelled by its own row's header cell. Note what is deliberately
 * absent — `aria-selected` belongs to `grid` and `treegrid`, and a row inside a
 * `table` ignores it. The checkbox IS the state, which is why it is not
 * optional.
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
    selection,
    onRowSelectToggle,
    onSelectAllToggle,
    ...rest
  } = props;

  const t = useMessages(tableMessages);

  // WHAT THE READER LAST ASKED FOR, and the only reason `Table` holds any state
  // at all. The live region must be silent on mount — a table rendered with
  // `defaultSortKey` is already sorted, and announcing that on arrival is a
  // sentence from nowhere — and must speak on every change after. A ref cannot
  // answer it: the Rules of React forbid reading one during render, which is
  // exactly when the announcement is built.
  //
  // It names the ACTION rather than being a boolean, because two mechanisms now
  // write to one region and the last one to be used is the one with something
  // to say — and the selection carries its SENTENCE rather than a tag, so no
  // later change to the data can rewrite it into a fresh announcement.
  const [acted, setActed] = useState<
    { kind: 'sort' } | { kind: 'said'; text: string } | null
  >(null);

  // Ours to generate: the checkbox in each row is labelled by the row's own
  // header cell, which needs an id to be pointed at.
  const baseId = useId();

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

  // THE CHECKBOX COLUMN EXISTS ONLY WHEN SOMETHING LISTENS, the same rule the
  // sort trigger follows. A box that reports an intent nobody handles is worse
  // than no box: it looks like state and holds none.
  const picks = selection !== undefined && Boolean(onRowSelectToggle);

  useDevWarning(
    selection !== undefined && !onRowSelectToggle,
    'Table: `selection` is passed but nothing is wired to `onRowSelectToggle`, so no checkbox column is drawn. Pass the props from `useRowSelection`.',
  );

  // The header box is a SEPARATE intent, and drawing it without a handler was
  // the same dead control the file refuses twice above: it clicked, changed
  // nothing, and announced that the selection had been cleared.
  useDevWarning(
    picks && !onSelectAllToggle,
    'Table: the rows are selectable but nothing is wired to `onSelectAllToggle`, so the header cell carries no box and there is no way to take a whole page. Pass the props from `useRowSelection`.',
  );

  // The column that NAMES the row, and the reason selection needs one. A
  // checkbox labelled "Select row" five times over is a control a screen reader
  // cannot tell apart from the other four; named after its row it says "Select
  // Zurigo".
  const rowHeaderColumn = columns?.find((column) => column.rowHeader);
  const rowHeaderKey = rowHeaderColumn?.key;

  useDevWarning(
    picks && columns !== undefined && rowHeaderKey === undefined,
    'Table: the rows are selectable but no column is marked `rowHeader`, so every checkbox is called "Select row" and a screen reader cannot tell them apart. Mark the column that identifies a row.',
  );

  // A row whose name renders as nothing ships the very failure the label
  // exists to prevent, minus the warning — an optional field, a `null` from the
  // API, a placeholder while loading. Checked only for a plain keyed column, so
  // a consumer's `cell` is never invoked twice to ask.
  useDevWarning(
    picks &&
      rowHeaderColumn !== undefined &&
      rowHeaderColumn.cell === undefined &&
      rows?.some(
        (row) =>
          String(
            (row as Record<string, unknown>)[rowHeaderColumn.key] ?? '',
          ).trim() === '',
      ) === true,
    'Table: a row renders nothing in its `rowHeader` column, so its checkbox is called just "Select" and is indistinguishable from the others. Give every row a name, or supply one with `cell`.',
  );

  const visibleIds = rows && getRowId ? rows.map(getRowId) : [];

  // The id is the whole basis of selection: two rows answering the same one are
  // one row as far as the rule is concerned, so ticking either ticks both — and
  // the request that follows names a record the reader never chose. `Table`
  // already warns for duplicate COLUMN keys; this is the one that corrupts data.
  useDevWarning(
    picks && new Set(visibleIds).size !== visibleIds.length,
    'Table: two rows share a `getRowId`, so selecting one selects the other and the rule cannot tell them apart. It must be the same value you would use as a React key.',
  );

  const coverage = selection ? coverageOf(selection, visibleIds) : 'none';

  // ANNOUNCED BY RENDERING, not by an effect. The region is always in the tree
  // and only its text changes, which is the reliable path.
  //
  // ALL THREE STOPS SPEAK. The cleared stop used to render `''`, and emptying a
  // live region announces NOTHING: `role="status"` implies
  // `aria-relevant="additions text"`, so a removal is not in the relevant set.
  // The one stop the design argues hardest for — back to the order the data
  // arrived in — was the one nobody was told about.
  //
  // ONLY THE HEADER BOX SPEAKS HERE, not a row's. A single checkbox announces
  // its own checked state natively, and repeating "Selected: 4" over it doubles
  // every tick; the header box changes many rows at once, and the count IS the
  // news — "checked" does not say that two hundred rows just came with it.
  //
  // WHICH IS WHY THE SELECTION'S SENTENCE IS CAPTURED AT CLICK TIME rather than
  // derived. Derived from the current coverage it re-announced on anything that
  // changed the count: a row tick after a select-all, and — with no interaction
  // at all — a refetch that returned one row fewer. A region whose text is a
  // function of the data speaks when the DATA moves, and only an interaction is
  // news. The sort half stays derived because `sort` cannot change without one.
  const announcement =
    acted === null
      ? ''
      : acted.kind === 'said'
        ? acted.text
        : sort && sortedColumn
          ? t(
              sort.direction === 'asc' ? 'sortedAscending' : 'sortedDescending',
              {
                column:
                  sortedColumn.sortLabel ??
                  (typeof sortedColumn.header === 'string'
                    ? sortedColumn.header
                    : sortedColumn.key),
              },
            )
          : t('sortCleared');

  // What the header box is ABOUT to do, which is knowable: `toggleRows` clears
  // when the page is already covered and selects otherwise. Under an `exclude`
  // rule "Selected: 3" would understate a selection that reaches rows nobody
  // here has seen, so it says so instead of counting.
  const selectAllSaid = () =>
    coverage === 'all'
      ? t('selectionCleared')
      : selection?.mode === 'exclude'
        ? t('selectionAll')
        : t('selectionCount', { count: visibleIds.length });

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
                {picks && (
                  <TableHeaderCell className={styles.selectCell}>
                    {/* NOTHING HIDDEN IN HERE. The verb the row labels borrow
                      used to live in this cell, and a `columnheader` takes its
                      name from its content — so the column announced itself as
                      "Select Select all rows", and a reader arrowing across a
                      row heard the verb three times. It sits outside the table
                      now; `aria-labelledby` reaches across the document. */}
                    {onSelectAllToggle && (
                      <Checkbox
                        checked={
                          coverage === 'all'
                            ? true
                            : coverage === 'some'
                              ? 'indeterminate'
                              : false
                        }
                        // The MIXED state is what a partial page means, and our
                        // `Checkbox` carries it as a value of `checked` — the
                        // DOM has no attribute for it, so nothing else would.
                        aria-label={t('selectAllRows')}
                        // Nothing to take: it offered a live control over an
                        // empty table, and clicking it announced that a
                        // selection had been cleared.
                        disabled={visibleIds.length === 0}
                        onChange={() => {
                          setActed({ kind: 'said', text: selectAllSaid() });
                          onSelectAllToggle(visibleIds);
                        }}
                      />
                    )}
                  </TableHeaderCell>
                )}
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
                            setActed({ kind: 'sort' });
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
                    colSpan={Math.max(columns.length + (picks ? 1 : 0), 1)}
                    className={styles.empty}
                  >
                    {hasRenderableChildren(empty) ? empty : t('empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => {
                  const rowId = getRowId(row);
                  const rowHeaderId = `${baseId}-r${index}`;
                  // GATED ON `picks`, not on `selection` alone. Tinted without a
                  // checkbox, the row conveyed its state by colour and nothing
                  // else — and the whole argument for the box being mandatory is
                  // that `aria-selected` cannot carry it.
                  const picked =
                    picks &&
                    selection !== undefined &&
                    isRowSelected(selection, rowId);

                  // Computed ONCE, here, and handed to the column below rather
                  // than derived twice — a consumer's `cell` is a function and
                  // calling it again to ask what it said is a cost they did not
                  // agree to.
                  const rowName = rowHeaderColumn
                    ? rowHeaderColumn.cell
                      ? rowHeaderColumn.cell(row)
                      : ((row as Record<string, unknown>)[
                          rowHeaderColumn.key
                        ] as ReactNode)
                    : undefined;
                  const namedInWords =
                    typeof rowName === 'string' || typeof rowName === 'number'
                      ? String(rowName).trim()
                      : '';

                  return (
                    <TableRow
                      key={rowId}
                      // A DATA ATTRIBUTE AND NOTHING ELSE. `aria-selected`
                      // belongs to `grid` and `treegrid`; on a row inside a
                      // `table` it is ignored, and writing it would be a
                      // component claiming to say something it does not. The
                      // checkbox carries the state for everybody — which is
                      // also why the box is not optional.
                      data-selected={picked ? '' : undefined}
                    >
                      {picks && (
                        <TableCell className={styles.selectCell}>
                          <Checkbox
                            checked={picked}
                            // A WHOLE SENTENCE WHEN THE NAME IS WORDS, and a
                            // reference only when it is not. Two fragments
                            // joined by `aria-labelledby` put the WORD ORDER in
                            // the code — "«verb» «name»", which Japanese and
                            // Turkish are not — and i18n.md forbids exactly
                            // that, for exactly that reason. A string row name
                            // is the overwhelmingly common case and it fills a
                            // one-hole message the catalog can reorder. A node
                            // (an icon, an `<abbr>`, a link) has no string to
                            // put in a hole, so it is pointed at instead: worse
                            // for word order, better than losing the name.
                            aria-label={
                              namedInWords !== ''
                                ? t('selectRowNamed', { name: namedInWords })
                                : rowName === undefined ||
                                    !hasRenderableChildren(rowName)
                                  ? t('selectRow')
                                  : undefined
                            }
                            aria-labelledby={
                              namedInWords === '' &&
                              rowName !== undefined &&
                              hasRenderableChildren(rowName)
                                ? `${baseId}-select ${rowHeaderId}`
                                : undefined
                            }
                            onChange={() => {
                              // The region falls silent: a single box announces
                              // its own state, and a count read over it doubles
                              // what the reader was just told.
                              setActed(null);
                              onRowSelectToggle?.(rowId);
                            }}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => {
                        const content =
                          column.key === rowHeaderKey
                            ? rowName
                            : column.cell
                              ? column.cell(row)
                              : ((row as Record<string, unknown>)[
                                  column.key
                                ] as ReactNode);

                        return column.rowHeader ? (
                          <TableHeaderCell
                            key={column.key}
                            align={column.align}
                            // ONLY WHEN SOMETHING POINTS AT IT. A row named in
                            // words fills the message instead, so an id here
                            // would be an attribute referenced by nothing on
                            // every row of every selectable table.
                            id={
                              picks &&
                              column.key === rowHeaderKey &&
                              namedInWords === ''
                                ? rowHeaderId
                                : undefined
                            }
                          >
                            {content}
                          </TableHeaderCell>
                        ) : (
                          <TableCell key={column.key} align={column.align}>
                            {content}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
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
      {/* THE VERB, once for the whole table, OUTSIDE it, and only where it can
        be needed. A row whose name is an ELEMENT has no string to fill
        `selectRowNamed` with, so it is labelled by this plus its own header
        cell instead — worse for word order, better than losing the name. Only
        a COMPUTED row-header column can produce one, since a keyed one is
        typed to text or numbers, so a plain table renders no span at all.

        It used to live in the header cell, which is where a `columnheader`
        takes its name from — so the column called itself "Select Select all
        rows" and a reader arrowing across a row heard the word three times.
        `aria-labelledby` is document-wide, so moving it here costs nothing. */}
      {picks && rowHeaderColumn?.cell !== undefined && (
        <VisuallyHidden id={`${baseId}-select`}>{t('select')}</VisuallyHidden>
      )}

      {(wired || picks) && (
        <VisuallyHidden role="status" data-table-status="">
          {announcement}
        </VisuallyHidden>
      )}
    </>
  );
}

export { Table };
