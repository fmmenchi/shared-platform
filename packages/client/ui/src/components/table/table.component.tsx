import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useCopyLocale, useMessages } from '../../i18n/provider.js';
import { Button } from '../button/button.component.js';
import { TableFilterTrigger } from '../table-filter-trigger/table-filter-trigger.component.js';
import { TableColumnResizer } from '../table-column-resizer/table-column-resizer.component.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { coverageOf, isRowSelected } from '../../selection/selection.js';
import { SortArrow } from './sort-arrow.component.js';
import { ExpandChevron } from './expand-chevron.component.js';
import { TableBody } from '../table-body/table-body.component.js';
import { TableCell } from '../table-cell/table-cell.component.js';
import { TableHead } from '../table-head/table-head.component.js';
import { TableHeaderCell } from '../table-header-cell/table-header-cell.component.js';
import { TableRow } from '../table-row/table-row.component.js';
import { tableMessages } from './table.messages.js';
import type { Column, TableProps } from './table.types.js';
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
    stickyHeader,
    scrollProps,
    className,
    columns,
    rows,
    getRowId,
    getRowProps,
    empty,
    children,
    sort,
    onSortToggle,
    filters,
    onFilterApply,
    resizableColumns,
    columnWidths,
    onColumnResize,
    expandedRows,
    onRowExpandToggle,
    renderDetail,
    selection,
    onRowSelectToggle,
    onSelectAllToggle,
    ...rest
  } = props;

  const t = useMessages(tableMessages);
  // The COPY's locale, not the reader's: a number inside a sentence has to be
  // written in the language of that sentence.
  const copyLocale = useCopyLocale();
  const numbers = useMemo(
    () => new Intl.NumberFormat(copyLocale),
    [copyLocale],
  );

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

  // ONE EXPRESSION, READ TWICE. The sticky attribute and the scroll wrapper
  // were written `stickyHeader ? …` and `stickyHeader === true ? …`, which
  // agree for a boolean and part company for anything else a JS consumer
  // spreads in — leaving the header sticky with nothing to stick inside, which
  // is the exact combination this feature exists to make unreachable.
  const sticky = stickyHeader === true;

  // ONE RULE, not two facts. `Column.resizable` OVERRIDES the table's switch
  // rather than standing beside it, so there is no arrangement in which the two
  // disagree — the shape this file has removed twice.
  const resizes = (column: Column<T>) =>
    (column.resizable ?? resizableColumns) === true;
  const resizable = columns?.some(resizes) === true;
  // A HANDLE THAT WILL ACTUALLY BE DRAWN. The last column never gets one, so a
  // single-column table — or one where only the last column is resizable — was
  // paying the whole cost (a fixed layout, the wider cell padding) for nothing
  // on screen.
  const resizesWired =
    Boolean(onColumnResize) &&
    columns?.some(
      (column, index) => resizes(column) && index < columns.length - 1,
    ) === true;

  // WHAT THE COLUMN IS ACTUALLY WIDE, and the order is the whole rule: a width
  // the reader chose overrides the one the column declared, and a column with
  // no entry keeps what it asked for.
  const widthOf = (column: Column<T>) =>
    columnWidths?.[column.key] ?? column.width;

  // DERIVED, NOT A SECOND PROP. A `layout` prop would be a fact that has to
  // agree with `Column.width` and can be set to disagree with it — the shape
  // this component has spent four milestones removing. One column asking for a
  // width is the whole condition.
  //
  // A RESIZABLE TABLE IS FIXED FROM THE START, before anything has been
  // dragged. Under the automatic algorithm a width is a suggestion the browser
  // overrides whenever the content is wider — so the first drag would move the
  // border and the column would spring back, which reads as the handle being
  // broken rather than as the layout having been automatic all along.
  const sized =
    columns?.filter((column) => widthOf(column) !== undefined) ?? [];
  const fixed = sized.length > 0 || resizesWired;

  // A WIDTH CSS CANNOT PARSE IS DROPPED BY THE CSSOM, silently — and it still
  // switches the table's layout algorithm, so one typo re-lays-out every OTHER
  // column into an equal share. Measured with `width: 'banana'`.
  useDevWarning(
    sized.some(
      (column) =>
        typeof CSS !== 'undefined' &&
        !CSS.supports('inline-size', widthOf(column) as string),
    ),
    'Table: a column declares a `width` that is not a valid CSS length, so the browser drops it — and the table is in a fixed layout anyway, which re-sizes every other column. Check the value.',
  );

  // EVERY column sized is the one arrangement where declaring a width stops
  // meaning what it says: the fixed algorithm redistributes the table's leftover
  // width across the columns, so the declarations become ratios. Leave one
  // column unsized and the rest hold exactly.
  // DECLARED widths, not the ones the reader chose. Derived from `widthOf` this
  // scolded a developer, on every render and unfixably, for a reader having
  // dragged every border — or for the restored layout the hook's own doc
  // recommends storing.
  const declared =
    columns?.filter((column) => column.width !== undefined) ?? [];
  useDevWarning(
    declared.length > 0 &&
      columns !== undefined &&
      declared.length === columns.length,
    'Table: every column declares a `width`, so the fixed layout has nothing to absorb the leftover and spreads it across all of them — the declared values become proportions rather than sizes. Leave at least one column unsized.',
  );

  const scroller = useRef<HTMLDivElement>(null);
  // WHETHER IT ACTUALLY SCROLLS, and it decides the tab stop. A region that
  // scrolls nothing is a dead stop and a landmark over no content — the same
  // rule this file applies to a sort trigger with no handler and a checkbox
  // column with nobody listening. It cannot be known from a render, so it is
  // measured and invalidated by the DOM, the way `Toolbar` does its ring.
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const node = scroller.current;
    if (node == null) return;

    const sync = () => {
      const head = node.querySelector('thead');
      if (head != null) {
        // Read by `scroll-padding-block-start`, so sequential focus navigation
        // stops putting a focused control under the header. Unprefixed: a
        // `--fm-` name is the token package's, and one invented here shows up
        // in a consumer's devtools as a theme value no theme can set.
        // CEIL OF THE FRACTIONAL HEIGHT. `offsetHeight` is an integer, and a
        // header measuring 36.31 rounds to 36 — which left 0.69px of the
        // focused control under it, measured. A rounding error is still an
        // obscured focus indicator.
        node.style.setProperty(
          '--table-head-block-size',
          `${Math.ceil(head.getBoundingClientRect().height)}px`,
        );
      }
      setScrolls(
        node.scrollHeight > node.clientHeight ||
          node.scrollWidth > node.clientWidth,
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    for (const part of node.querySelectorAll('thead, tbody')) {
      observer.observe(part);
    }
    return () => observer.disconnect();
  }, [sticky]);

  // `hasRenderableChildren` rather than a null check, and the difference is the
  // shape a real call site writes: `caption={showIt && t('orders')}` passes
  // `false`, which is a legal ReactNode that renders NOTHING — the unnamed
  // table this prop exists to prevent, arriving through the one path the
  // simpler check could not see. Whitespace is the same story.
  useDevWarning(
    !hasRenderableChildren(caption),
    'Table: `caption` renders no text, so the table has no accessible name. Assistive technology lists the tables on a page, and unnamed ones are identical entries. Use `VisuallyHidden` if the design has no room for it.',
  );

  // ELEMENTS ARE NOT WORDS. `hasRenderableChildren` is true for any element,
  // so `caption={<Icon/>}` passes the check above and the table is unnamed
  // anyway — and now the scroll region borrows that name, so one mistake buys
  // an unnamed table AND a focusable landmark announced as nothing. Only the
  // DOM can answer this, so it is asked after the commit.
  const captionRef = useRef<HTMLTableCaptionElement>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (captionRef.current?.textContent?.trim() === '') {
      console.warn(
        'Table: `caption` renders elements but no TEXT, so the table has no accessible name — and neither does the scroll region that borrows it. Put words in it, or wrap the words in `VisuallyHidden`.',
      );
    }
  }, [caption]);

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

  // The same rule the sort trigger follows, and it is the rule rather than a
  // copy of it: a control that reports an intent nobody handles is a dead
  // control, so it is not drawn.
  const filterable =
    columns?.some((column) => column.filterable === true) === true;
  const filtersWired = filterable && Boolean(onFilterApply);

  useDevWarning(
    filterable && !onFilterApply,
    'Table: a column is marked `filterable` but nothing is wired to `onFilterApply`, so no trigger is drawn. Pass the props from `useTableFilters` (or `useFilterState`, if the server does the narrowing).',
  );

  // The trigger's accessible name IS the column's name, so a column with an
  // icon for a `header` produces "Filter first_name" — the same failure the
  // sorted column warns about, in a control rather than an announcement.
  const unnamed = columns?.find(
    (column) =>
      column.filterable === true &&
      column.label === undefined &&
      typeof column.header !== 'string',
  );
  useDevWarning(
    filtersWired && unnamed !== undefined,
    `Table: the filterable column \`${String(unnamed?.key)}\` has a \`header\` that is not a string, so its filter control is called after its \`key\` — a developer identifier, untranslated, inside localized copy. Give the column a \`label\`.`,
  );

  // THE PROP THIS RELEASE REMOVED, and the reason it gets a warning rather than
  // a line in the changelog: `Column.sortLabel` shipped in 0.3.1, and a consumer
  // building their columns from a mapped or spread source gets NO excess-
  // property check — so the rename lands as silence, with the announcement
  // falling back to the column's `key`. TypeScript catches the literal case;
  // this catches the other one.
  const renamed = columns?.some((column) => 'sortLabel' in (column as object));
  useDevWarning(
    renamed === true,
    "Table: a column carries `sortLabel`, which is now `label` — it was never about sorting, and the filter control is named from it too. The old name is ignored, so the announcement falls back to the column's `key`.",
  );

  useDevWarning(
    resizable && !onColumnResize,
    'Table: columns are marked resizable but nothing is wired to `onColumnResize`, so no handle is drawn. Pass the props from `useColumnWidths`.',
  );

  // A WIDTH IN A UNIT THE HANDLE CANNOT RETURN TO. The gesture measures the
  // rendered column and reports pixels, so a column declared in `%` jumps to a
  // fixed width the first time it is touched and never goes back on its own —
  // which looks like the handle breaking the layout rather than like the layout
  // having been relative all along. `Enter` restores it, and this says so.
  useDevWarning(
    resizesWired &&
      columns?.some(
        (column) =>
          resizes(column) &&
          column.width !== undefined &&
          /%|v[wh]/.test(column.width),
      ) === true,
    'Table: a resizable column declares a relative `width` (`%`, `vw`). Resizing reports pixels, so the first drag replaces the relative width with a fixed one and it stops responding to the container. `Enter` on the handle puts it back.',
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
      sortedColumn.label === undefined &&
      typeof sortedColumn.header !== 'string',
    'Table: the sorted column has a `header` that is not a string, so the announcement falls back to its `key` — a developer identifier, untranslated, read out inside localized copy. Give the column a `label`.',
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

  // THE CONTROL COLUMN EXISTS ONLY WHEN ALL THREE ARE THERE, which is the same
  // rule the checkbox column follows with one more term: a chevron with nobody
  // listening is a dead control, and a chevron that opens an empty row is
  // worse — it looks like the data is missing rather than like the feature is.
  const expands =
    expandedRows !== undefined &&
    Boolean(onRowExpandToggle) &&
    Boolean(renderDetail);

  useDevWarning(
    expandedRows !== undefined && !onRowExpandToggle,
    'Table: `expandedRows` is passed but nothing is wired to `onRowExpandToggle`, so no detail control is drawn. Pass the props from `useRowExpansion`.',
  );

  useDevWarning(
    expandedRows !== undefined &&
      Boolean(onRowExpandToggle) &&
      renderDetail === undefined,
    'Table: the rows are expandable but `renderDetail` is missing, so there is nothing for a control to open and none is drawn. A detail is prose, a form, a nested list — the things a `Column` cannot express, which is what this prop is for.',
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
                  sortedColumn.label ??
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
  const selectAllSaid = () => {
    if (coverage === 'all') return t('selectionCleared');
    if (selection?.mode === 'exclude') {
      // WHAT SURVIVES THE CLICK, not what the mode implies. Completing the page
      // removes only the VISIBLE exceptions from the rule, so exceptions on
      // pages nobody here has seen live on — and "All rows selected." was
      // false precisely for the reader who cannot see those pages. The bar
      // answers the same state with the same sentence (`allExcept`), and the
      // two must not disagree about the same click.
      const visible = new Set(visibleIds);
      let remaining = 0;
      for (const id of selection.ids) if (!visible.has(id)) remaining += 1;
      return remaining === 0
        ? t('selectionAll')
        : t('selectionAllExcept', { count: numbers.format(remaining) });
    }
    // THROUGH `Intl`, like the bar's. The two say the same-looking sentence
    // about the same click, and rendering one as "1,500" while the other says
    // "1500" is a drift a reader hears.
    return t('selectionCount', { count: numbers.format(visibleIds.length) });
  };

  const table = (
    <table
      {...rest}
      aria-busy={busy || undefined}
      data-density={density}
      data-sticky-header={sticky ? '' : undefined}
      data-layout={fixed ? 'fixed' : undefined}
      // WIDER CELLS, and the cost is stated in the prop's doc. The handle
      // straddles each boundary, so the padding on both sides of it has to be
      // at least half its width or the target lands on the heading.
      data-resizable={resizesWired ? '' : undefined}
      className={cn(styles.table, className)}
    >
      {/* First child, as the parser requires — and a real `<caption>` rather
          than an `aria-label`, so it is announced AND readable. */}
      <caption
        ref={captionRef}
        // ONLY WHEN SOMETHING POINTS AT IT — the rule this file already applies
        // to the row-header ids forty lines down.
        id={sticky ? `${baseId}-caption` : undefined}
        className={styles.caption}
      >
        {caption}
      </caption>

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
              {expands && (
                <TableHeaderCell className={styles.expandCell}>
                  {/* NAMED BUT NOT SHOWN. A column of chevrons with an empty
                      header is a column a screen reader announces as nothing,
                      and a visible word here would be a heading for a control
                      rather than for data. */}
                  <VisuallyHidden>{t('expand')}</VisuallyHidden>
                </TableHeaderCell>
              )}
              {columns.map((column, index) => {
                const active = sort?.key === column.key;
                const canSort = column.sortable === true && onSortToggle;
                const canFilter = column.filterable === true && onFilterApply;
                // NEVER ON THE LAST COLUMN. Its trailing edge is the edge of
                // the table, so a handle there would resize the table rather
                // than a column — a different thing wearing the same grip.
                // THE HANDLER ITSELF, not a boolean, so the closures below
                // are typed without a second assertion — the shape `canFilter`
                // already uses one line up.
                const canResize =
                  resizes(column) && index < columns.length - 1
                    ? onColumnResize
                    : undefined;
                // THE COLUMN'S NAME IN WORDS, computed once: it names the
                // trigger and it names the cell, and two copies of a fallback
                // chain are two places for those to disagree.
                const columnName =
                  column.label ??
                  (typeof column.header === 'string'
                    ? column.header
                    : column.key);

                // THE COLUMN'S OWN CONTENT, control or not — built once
                // because the filter trigger puts it inside a wrapper and the
                // plain header does not, and a second copy of this JSX is a
                // second place for the two to drift apart.
                const heading = canSort ? (
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
                );

                const headerId = `${baseId}-c-${column.key}`;

                return (
                  <TableHeaderCell
                    key={column.key}
                    // ONLY WHERE SOMETHING POINTS AT IT. An id on every header
                    // cell of every table is markup nobody reads.
                    id={canResize !== undefined ? headerId : undefined}
                    align={column.align}
                    // AN EXPLICIT NAME, and only when a control that is not the
                    // heading lives in the cell. A `columnheader` is named FROM
                    // ITS CONTENTS, and a name is computed for each descendant
                    // — so the trigger's own `aria-label` joined the column's
                    // name and every cell under it was announced as "Regione
                    // Filter Regione, currently Lombardia". Measured against
                    // Chromium's AX tree, both closed and open; `dom-
                    // accessibility-api`, which this suite's matchers and axe
                    // use, does not reproduce it, so no assertion on the NAME
                    // can guard this — the test asserts the attribute instead.
                    //
                    // It is the same defect the checkbox column already fixed
                    // by moving its words out of the cell, and the sort trigger
                    // never had, because that button's name IS the heading.
                    aria-label={canFilter || canResize ? columnName : undefined}
                    // ON THE HEADER CELL ONLY, because under `table-layout:
                    // fixed` the first row is what decides every column — the
                    // body cells inherit the answer and repeating it there
                    // would be the same declaration written N times.
                    style={
                      widthOf(column) === undefined
                        ? undefined
                        : { inlineSize: widthOf(column) }
                    }
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
                    {/* TWO CONTROLS NEED A BOX, and it cannot be the cell:
                        `display: flex` on a `<th>` takes it out of the table
                        box model, so an anonymous cell is generated around it
                        and the declared column widths stop meaning anything.
                        (The role SURVIVES — measured against Chromium's AX
                        tree, a flexed `<th scope="col">` is still a
                        `columnheader`. An earlier version of this comment
                        claimed otherwise.) So the wrapper appears only when
                        there is something to lay out, which is what earns
                        it. */}
                    {canFilter ? (
                      <span className={styles.headerControls}>
                        {heading}
                        <TableFilterTrigger
                          label={columnName}
                          value={filters?.[column.key] ?? ''}
                          onApply={(value) => {
                            onFilterApply(column.key, value);
                          }}
                        />
                      </span>
                    ) : (
                      heading
                    )}

                    {/* AFTER the content, and positioned out of the flow: it
                        straddles the boundary, so half of it sits in this
                        cell's trailing padding and half in the next cell's
                        leading one — dead space on both sides, which is how a
                        24px target costs no content width. */}
                    {canResize && (
                      <TableColumnResizer
                        label={columnName}
                        controls={headerId}
                        onResize={(next) => {
                          canResize(column.key, `${next}px`);
                        }}
                        onReset={() => {
                          // EMPTY, not the declared value copied back: the
                          // column already holds that, and a second copy is a
                          // second thing to keep in step.
                          canResize(column.key, '');
                        }}
                      />
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
                  colSpan={Math.max(
                    columns.length + (picks ? 1 : 0) + (expands ? 1 : 0),
                    1,
                  )}
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

                const detailId = `${baseId}-d${index}`;
                const open = expands && expandedRows?.has(rowId) === true;

                return (
                  // A FRAGMENT, because a row's detail is a SECOND ROW and a
                  // `<tbody>` takes rows. Wrapping the pair in a `<tbody>` of
                  // its own was the alternative and it is worse: a table with
                  // one body section per row announces a group boundary the
                  // data does not have.
                  <Fragment key={rowId}>
                    <TableRow
                      // THE CONSUMER'S ATTRIBUTES FIRST, so what follows wins.
                      // `data-selected` is the component's to set: the checkbox
                      // and the attribute have to agree, and two writers is how
                      // they stop agreeing.
                      {...getRowProps?.(row, index)}
                      // A DATA ATTRIBUTE AND NOTHING ELSE. `aria-selected`
                      // belongs to `grid` and `treegrid`; on a row inside a
                      // `table` it is ignored, and writing it would be a
                      // component claiming to say something it does not. The
                      // checkbox carries the state for everybody — which is
                      // also why the box is not optional.
                      data-selected={picked ? '' : undefined}
                    >
                      {expands && (
                        <TableCell className={styles.expandCell}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={styles.expandTrigger}
                            // THE STATE GOES HERE, and this is the whole reason
                            // the control is a button in a cell rather than
                            // something on the row: `aria-expanded` is listed for
                            // `row`, but only inside a `grid` or `treegrid`. On a
                            // row in a `table` it is not announced, so writing it
                            // there would be an attribute that reads as a promise
                            // and delivers nothing — the same trap `aria-selected`
                            // sets one feature over.
                            aria-expanded={open}
                            // AND WHAT IT OPENS. The detail row exists while it
                            // is closed and is merely `hidden`, so this always
                            // points at something: a reference to an element that
                            // is not in the document is a promise to nobody.
                            aria-controls={detailId}
                            aria-label={
                              namedInWords !== ''
                                ? t('expandRowNamed', { name: namedInWords })
                                : rowName === undefined ||
                                    !hasRenderableChildren(rowName)
                                  ? t('expandRow')
                                  : undefined
                            }
                            aria-labelledby={
                              namedInWords === '' &&
                              rowName !== undefined &&
                              hasRenderableChildren(rowName)
                                ? `${baseId}-expand ${rowHeaderId}`
                                : undefined
                            }
                            onClick={() => {
                              // The region falls silent: `aria-expanded` on the
                              // control announces the change, and a sentence read
                              // over it doubles what the reader was just told.
                              setActed(null);
                              onRowExpandToggle?.(rowId);
                            }}
                          >
                            <ExpandChevron open={open} />
                          </Button>
                        </TableCell>
                      )}
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
                    {expands && (
                      // RENDERED WHILE CLOSED, and `hidden` rather than absent —
                      // so `aria-controls` above always names something, and so
                      // the row is out of the accessibility tree and out of the
                      // tab order while it is shut, which `hidden` does and a
                      // class cannot.
                      <TableRow id={detailId} hidden={!open} data-detail="">
                        {/* COUNTED, not typed — the same rule the empty row
                          follows, and it has to include the two control
                          columns. Note what a spanning cell costs, stated
                          rather than discovered: a cell across every column is
                          associated with EVERY column header, so a reader hears
                          them all before the detail. It is named instead, which
                          is the one thing that makes that bearable. */}
                        <TableCell
                          colSpan={Math.max(
                            columns.length + (picks ? 1 : 0) + 1,
                            1,
                          )}
                          className={styles.detail}
                          aria-label={
                            namedInWords !== ''
                              ? t('detail', { name: namedInWords })
                              : t('detailRow')
                          }
                        >
                          {/* ONLY WHEN IT IS OPEN. A consumer's `renderDetail` is
                            a function, and calling it for every closed row of a
                            long table is work nobody asked for — a nested table,
                            a chart, a query. */}
                          {open ? renderDetail?.(row) : null}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </>
      ) : (
        children
      )}
    </table>
  );

  return (
    <>
      {/* THE SCROLLER, and a tab stop, and a name — three things that are one
        decision. `position: sticky` needs something to scroll inside or it
        pins to the viewport; a region that scrolls has to be reachable by
        keyboard, because somebody who cannot use a pointer has no other way
        to reach the columns off to the right; and a tab stop with no name is
        an entry a screen reader announces as nothing. The `<caption>` is
        already the table's name, so it is the region's too — one string, and
        it cannot drift from the table it belongs to. */}
      {sticky ? (
        <div
          {...scrollProps}
          ref={scroller}
          data-table-scroll=""
          className={cn(styles.scroll, scrollProps?.className)}
          // ONLY WHEN THERE IS SOMETHING TO SCROLL. Unconstrained — or given a
          // `max-block-size` on the parent, which resolves to `none` against an
          // indefinite containing block — nothing scrolls in either axis, and
          // the wrapper was still shipping a tab stop and a landmark over
          // content that does not move.
          tabIndex={scrolls ? 0 : undefined}
          role={scrolls ? 'region' : undefined}
          aria-labelledby={scrolls ? `${baseId}-caption` : undefined}
        >
          {table}
        </div>
      ) : (
        table
      )}

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
      {expands && rowHeaderColumn?.cell !== undefined && (
        <VisuallyHidden id={`${baseId}-expand`}>{t('expand')}</VisuallyHidden>
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
