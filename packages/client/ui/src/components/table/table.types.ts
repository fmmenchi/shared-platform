import type { ComponentPropsWithRef, ReactNode } from 'react';

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
}

/**
 * A column whose key names a property of the row: `cell` is optional, and the
 * value is read straight off the row.
 */
interface KeyedColumn<T> extends ColumnShape {
  key: Extract<keyof T, string>;
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
  children?: never;
}

interface TableComposed extends TableShared {
  /** The parts, for a layout the column model cannot express. */
  children: ReactNode;
  rows?: never;
  columns?: never;
  getRowId?: never;
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

/**
 * The union flattened, for the implementation alone.
 *
 * A rest element cannot be spread out of a union — TypeScript has no single
 * object type to take it from — so the component widens once, here, instead of
 * casting at every use. The PUBLIC type stays the union, which is what keeps
 * the two modes mutually exclusive at the call site.
 */
export type TableAnyProps<T> = TableShared & {
  columns?: readonly Column<T>[];
  rows?: readonly T[];
  getRowId?: (row: T) => string;
  empty?: ReactNode;
  children?: ReactNode;
};
