import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { SortState } from '../../sorting/compare.types.js';

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
   * What the live region calls this column, when `header` is not a string.
   *
   * `header` is a `ReactNode` because a real header holds an icon, an `<abbr>`
   * or a `<Badge>` — and the announcement needs WORDS. Without this the
   * fallback is the column's `key`, so a reader hears "Sorted by first_name,
   * ascending": a developer identifier, untranslated, inside DS-owned copy.
   * A non-string header on a sortable column warns until this is supplied.
   */
  sortLabel?: string;
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
