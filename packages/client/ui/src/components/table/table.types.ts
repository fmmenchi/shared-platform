import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { SortState } from '../../sorting/compare.types.js';
import type { ColumnWidths } from './use-column-widths.types.js';
import type { Selection } from '../../selection/selection.types.js';

/** Which edge a column's content sits against. Numbers want `end`. */
export type TableAlign = 'start' | 'end';

/** How much air a row gets. */
export type TableDensity = 'comfortable' | 'compact';

interface ColumnShape {
  /** What the column's `<th>` says. */
  header: ReactNode;
  /**
   * Declared ONCE here rather than repeated on every cell. In a composed table
   * `align="end"` has to be written on the header and on each row's cell — the
   * same decision copied N times, which this package already forbids.
   */
  align?: TableAlign;
  /**
   * Marks the column that identifies the row: it renders `<th scope="row">`
   * instead of `<td>`, so a screen reader announces WHICH row a cell belongs to
   * as the reader moves across it. It is the thing nobody writes by hand, and
   * declaring it on the column gives it to every row at once.
   */
  rowHeader?: boolean;
  /**
   * How wide this column is — any CSS length: `'8rem'`, `'12ch'`, `'20%'`.
   *
   * DECLARING ONE PUTS THE WHOLE TABLE IN `table-layout: fixed`, and that is
   * the part to understand before using it. Under the automatic algorithm a
   * width is a SUGGESTION the browser overrides whenever the content is wider,
   * so a declaration would sometimes do nothing and never say so — the class of
   * defect this component spends its warnings on. Fixed makes it mean what it
   * says.
   *
   * What that costs, stated rather than discovered: content no longer widens
   * its column. Long text wraps, and `white-space: nowrap` clips instead.
   * Columns with no width share what is left, equally.
   *
   * `ch` is usually the right unit for text — it is the width of a "0", so
   * `'12ch'` is about twelve digits and stays right when the reader changes
   * their font size, which a `rem` does not.
   *
   * This is a LAYOUT declaration, not a resize affordance: nothing here can be
   * dragged, and nothing here needs a keyboard.
   */
  width?: string;
  /**
   * Puts a real `<button>` in the header and lets `aria-sort` land on this
   * column when it is the one in force.
   *
   * It declares the AFFORDANCE, not the ordering: what "sorted by priority"
   * means is the consumer's, and it reaches the table through `useTableSort`.
   * Marking it with nothing wired to `onSortToggle` warns in development and
   * renders the plain header — a control that reorders nothing is the table's
   * version of a field that accepts typing and submits nothing.
   */
  sortable?: boolean;
  /**
   * Puts a filter control in the header — a trigger that opens an editor, not
   * a box sitting in the column.
   *
   * A permanent input is a tab stop on every filterable column whether anybody
   * is filtering or not, plus a row of chrome above the data. The trigger is
   * one stop, and what it opens exists only while the reader is editing.
   *
   * It declares the AFFORDANCE, not what the value means: "contains" is the
   * default, and a column that means something else says so with a predicate
   * in `useTableFilters`. Marked with nothing wired to `onFilterApply` it warns
   * and renders nothing, like `sortable`.
   */
  filterable?: boolean;
  /**
   * Whether this column's trailing border can be moved — an OVERRIDE of the
   * table's `resizableColumns`, not a second switch beside it.
   *
   * The resolution is one rule, `column.resizable ?? resizableColumns`, and it
   * is one rule on purpose: two independent facts about the same column is how
   * they start disagreeing, and this file has removed that shape twice already.
   * So `false` opts a column out of a resizable table — an identifier column
   * that must stay legible — and `true` opts one in where the table says
   * nothing.
   *
   * The LAST column never gets a handle whatever this says: its trailing edge
   * is the edge of the table, so dragging it would resize the table rather than
   * a column.
   */
  resizable?: boolean;
  /**
   * The column's name IN WORDS, for the places a `header` cannot go.
   *
   * `header` is a `ReactNode` because a real header holds an icon, an `<abbr>`
   * or a `<Badge>` — and a live region needs words, and so does a filter
   * control's name and the header cell's own. Without this the fallback is the
   * column's `key`, so a reader hears "Sorted by first_name": a developer
   * identifier, untranslated, inside localized copy.
   *
   * `TableToolbar` is NOT one of its readers, and cannot be: it never sees the
   * column model, so it takes the same words again as `filterLabels`. Two homes
   * for one fact, and the seam is where they meet rather than something either
   * of them can fix — it is the price of a toolbar that works without a table.
   *
   * It was `sortLabel` and is not any more, because it was never about sorting:
   * one fact with two names is how the second feature starts disagreeing with
   * the first.
   */
  label?: string;
}

/**
 * The keys React can render on its own: text and numbers, nullable or not.
 *
 * EVERYTHING ELSE MUST SAY HOW, and this is the constraint the first version
 * was missing — it took any `keyof T` and cast the value to `ReactNode`, which
 * is a promise TypeScript never checked. Measured consequences of that cast:
 *
 *   - a `Date` column threw "Objects are not valid as a React child" and took
 *     the page down. A date column is the most common column there is;
 *   - an object column did the same;
 *   - a BOOLEAN column rendered a BLANK cell on every `false` row — React
 *     renders nothing for a boolean — which is indistinguishable from missing
 *     data and sends the reader looking in their fetch layer;
 *   - an array rendered `['a','b']` as `ab`, which is worse than blank because
 *     it looks deliberate.
 *
 * Booleans and dates are excluded on purpose rather than formatted for you:
 * there is no canonical rendering of `false` (a dash? "No"? an icon?) and none
 * of a date (which format, whose timezone?). Guessing would be a design system
 * making a product decision. Saying `cell` is one line.
 */
type RenderableKey<T> = Extract<
  {
    [K in keyof T]: NonNullable<T[K]> extends string | number ? K : never;
  }[keyof T],
  string
>;

/**
 * A column whose key names a property of the row that React can render: `cell`
 * is optional, and the value is read straight off the row.
 */
interface KeyedColumn<T> extends ColumnShape {
  key: RenderableKey<T>;
  cell?: (row: T) => ReactNode;
}

/**
 * A column that is computed — a full name, a total, a formatted date. The key
 * is then free, and `cell` is what makes it legal: the only way to introduce a
 * key the row does not have is to say how it is produced.
 */
interface ComputedColumn<T> extends ColumnShape {
  key: string;
  cell: (row: T) => ReactNode;
}

/**
 * A column, as data rather than as markup.
 *
 * This is the decision the whole component rests on, and it is not stylistic:
 * it is the only way to GUARANTEE the invariants that run across a row, instead
 * of watching for them. With JSX a caller can write four `<th>` and five
 * `<td>` — the screen reader then attributes every cell to the wrong column,
 * and nothing on screen looks wrong. Here the header and the body are generated
 * from one list, so they cannot disagree; the empty row's `colSpan` is counted
 * rather than typed; and per-column decisions are declared once.
 *
 * The two shapes are a union on purpose: a key that is not a property of the
 * row is a compile error unless you supply the `cell` that produces it.
 */
export type Column<T> = KeyedColumn<T> | ComputedColumn<T>;

interface TableShared extends Omit<
  ComponentPropsWithRef<'table'>,
  'children' | 'summary'
> {
  /**
   * What this table is, as a real `<caption>`.
   *
   * Required, and not a nicety: assistive technology lists the tables on a
   * page, and without a name they are identical entries. Wrap it in
   * `VisuallyHidden` when the design has no room for it — hidden from sight is
   * not hidden from the list.
   */
  caption: ReactNode;
  density?: TableDensity;
  /**
   * Keep the column headers in view while the rows scroll under them.
   *
   * It also puts the table in a SCROLL CONTAINER, and that is not a bonus: a
   * sticky header with nothing scrolling around it pins to the viewport, so
   * the header of a table halfway down a page rides over everything above it.
   * The two are one feature.
   *
   * The container is where the rest of the obligation lives. A region that
   * scrolls must be reachable by keyboard — somebody who cannot use a pointer
   * has no other way to see the columns off to the right — so it takes a tab
   * stop, and a tab stop with no name is an entry a screen reader reads as
   * nothing. It is named by the table's own `<caption>`.
   *
   * How TALL it is belongs to the box you put it in, and it has to be a
   * DEFINITE height — `block-size: 20rem`, or a flex/grid track. A
   * `max-block-size` on the parent does not work: the container's own
   * percentage resolves to `none` against an indefinite box, so nothing
   * scrolls, the header never sticks, and the table overflows the box you just
   * constrained. Given no constraint at all the container is inert — no tab
   * stop, no landmark — rather than a dead one.
   */
  stickyHeader?: boolean;
  /**
   * Props for the scroll container `stickyHeader` renders — its height, a
   * `ref`, a class of your own.
   *
   * It exists because `className`, `style` and `ref` go to the `<table>`, and
   * with a wrapper around it that silently stops being the outermost node:
   * a margin or a grid placement written on `Table` applies one level in. This
   * is the way to reach the box that is actually laid out.
   */
  scrollProps?: ComponentPropsWithRef<'div'>;
  /**
   * Something is arriving. Describes the ELEMENT's state, not where the data
   * comes from — which is why this exists and a `loading` prop does not: a
   * background refetch is busy while the old rows are still on screen, and a
   * client-side re-sort is busy too.
   */
  busy?: boolean;
}

interface TableFromData<T> extends TableShared {
  rows: readonly T[];
  columns: readonly Column<T>[];
  /**
   * The row's identity. The one thing we ask of you, because we do not own the
   * rows and cannot invent it — and because selection and focus both depend on
   * it surviving a re-sort.
   *
   * It must be the same value you would use as a React `key`: an array index
   * makes React reuse the wrong nodes after a sort, and the focus and selection
   * that follow them look like our bug.
   */
  getRowId: (row: T) => string;
  /** Shown in place of the body when there are no rows. */
  empty?: ReactNode;
  /**
   * Which column is ordered and which way — DISPLAYED, never acted on.
   *
   * `Table` does not sort. The rows arrive in the order somebody else chose —
   * `useTableSort` in memory, or the server — and this only decides which
   * header carries `aria-sort` and which way its arrow points. That is what
   * makes one component serve both cases with the same markup.
   *
   * It lives HERE rather than on the shared base because it needs the column
   * list to mean anything: in composed mode there are no columns to put
   * `aria-sort` on, so the prop was accepted, inert and unwarned.
   */
  sort?: SortState | null;
  /**
   * The user activated a column's sort control. It receives the COLUMN KEY,
   * not the resulting state, and that is deliberate: the component reports the
   * intent and never computes the transition, so the cycle belongs to whoever
   * owns the state and can read its latest value.
   *
   * `useSortState` and `useTableSort` supply it through `props`. Wiring it by
   * hand is `onSortToggle={(key) => setSort((prev) => nextSort(prev, key))}` —
   * `nextSort` is exported for exactly this, and the functional form is what
   * keeps a second click correct when the update is deferred.
   */
  onSortToggle?: (key: string) => void;
  /**
   * What is applied to each column right now — DISPLAYED, never acted on, the
   * same bargain `sort` makes.
   *
   * `Table` does not filter. The rows arrive already narrowed by somebody else
   * — `useTableFilters` in memory, or the server — and this only decides which
   * trigger reads as active and what value it shows. One component then serves
   * both cases with the same markup.
   *
   * A column absent from this map, or holding `''`, is unfiltered: the two are
   * the same fact and are treated as one, because `{ city: '' }` and `{}`
   * describe the same view.
   */
  filters?: Readonly<Record<string, string>>;
  /**
   * A column's filter was applied, or cleared. It receives the KEY and the
   * whole VALUE — never a keystroke, and never the resulting map: the component
   * reports the intent and whoever owns the state computes the transition, so a
   * clear is an apply of `''` rather than a second callback.
   *
   * `useFilterState` and `useTableFilters` supply it through `props`.
   */
  onFilterApply?: (key: string, value: string) => void;
  /**
   * Turns the resize handles on for every column, which `Column.resizable` can
   * then override one at a time.
   *
   * It is a TABLE-level switch because resizing is a table-level affordance:
   * a reader who can move one border expects to move them all, and a table with
   * three draggable columns out of eight teaches nothing except that the rule
   * is somewhere else.
   *
   * It also costs horizontal space, said here rather than discovered: the cells
   * take a wider inline padding so the 24px handle straddling each boundary
   * stays clear of the heading and of the filter control.
   */
  resizableColumns?: boolean;
  /**
   * How wide each column is — DISPLAYED, never measured, the same bargain
   * `sort` and `filters` make. An entry overrides that column's own `width`;
   * a column with no entry keeps what it declared.
   */
  columnWidths?: ColumnWidths;
  /**
   * The reader finished resizing a column. It receives the KEY and the whole
   * WIDTH as a CSS length — one call per gesture, never one per pixel: the
   * handle paints the drag itself, because a width is what the browser is
   * already computing sixty times a second and routing it through React would
   * re-render every row to move one border.
   *
   * An empty string is a RESET rather than a width of zero — the column goes
   * back to what it declares. `useColumnWidths` supplies this through `props`.
   */
  onColumnResize?: (key: string, width: string) => void;
  /**
   * Which rows are picked. With `onRowSelectToggle` it adds the checkbox
   * column — the column is OURS to draw rather than yours to write as a `cell`,
   * because the part nobody gets right is not the box, it is what the box is
   * called: a screen reader landing on the fifth one has to hear which row it
   * selects.
   *
   * Note what a row in a `<table>` does not do here. `aria-selected` is listed
   * as a supported property of the `row` role, but it is only MEANINGFUL inside
   * a `grid` or `treegrid`; in a table it is not announced, so writing it would
   * be an attribute that reads as a promise and delivers nothing. The checkbox
   * IS the state, for everyone — a reason to keep it rather than a limitation
   * to route around.
   */
  selection?: Selection;
  /** A row's checkbox was activated. Receives the id `getRowId` produced. */
  onRowSelectToggle?: (id: string) => void;
  /**
   * The header's checkbox was activated, and it receives THE IDS THIS TABLE
   * RENDERED — the rows on screen are its fact, and a second copy of them kept
   * elsewhere is what let a header box speak for rows the reader could not see.
   *
   * It speaks for those and nothing else: "select all 10,000 matching" is a
   * different affordance, and only you know whether there are more rows than
   * the ones you handed over.
   */
  onSelectAllToggle?: (ids: readonly string[]) => void;
  children?: never;
}

interface TableComposed extends TableShared {
  /** The parts, for a layout the column model cannot express. */
  children: ReactNode;
  rows?: never;
  columns?: never;
  getRowId?: never;
  /**
   * Refused rather than ignored. `aria-sort` needs a column list to land on,
   * so in composed mode these decided nothing while the prop doc claimed they
   * chose which header carries it. Put the attribute on your own
   * `TableHeaderCell` here — it takes `aria-sort` like any `<th>`.
   */
  sort?: never;
  onSortToggle?: never;
  /**
   * Refused with `sort`, and for the same reason: the trigger is drawn from the
   * column list, and there is none here. Put `TableFilterTrigger` in your own
   * `TableHeaderCell` and drive it with `useFilterState`.
   */
  filters?: never;
  onFilterApply?: never;
  /**
   * Refused with the others, and for the same reason: the handle is placed from
   * the column list, and there is none here. Put `TableColumnResizer` in your
   * own `TableHeaderCell` and drive it with `useColumnWidths`.
   */
  resizableColumns?: never;
  columnWidths?: never;
  onColumnResize?: never;
  /**
   * Refused for the same reason as `sort`: the checkbox column is generated
   * from the column list, and there is none here. Write the cells yourself and
   * drive them with `useRowSelection` — but read what `Table` does with the
   * labelling first, because that is the part that goes wrong.
   */
  selection?: never;
  onRowSelectToggle?: never;
  onSelectAllToggle?: never;
  /**
   * Listed with the others, and its absence was a real bug rather than an
   * omission: without it the union had no member declaring `empty`, so the
   * implementation could not destructure a rest element out of it — which is
   * what a whole flattened type and a cast existed to work around. It also
   * meant `empty` on a composed table was refused only by excess-property
   * checking, so a spread slipped it through and it was silently ignored.
   */
  empty?: never;
}

/**
 * Either the column model or the parts — never both, and the compiler says so.
 *
 * The parts are the substrate `Table` is built on, exported for the layouts a
 * flat column list cannot express (header groups, spanning rows, a totals
 * footer). Dropping to them is decomposition, not a second product: the same
 * relationship `Field` has to `FormInput`.
 */
export type TableProps<T> = TableFromData<T> | TableComposed;
