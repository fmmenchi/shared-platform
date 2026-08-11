import type { ReactNode } from 'react';
import type { HiddenColumns } from '../table/use-column-visibility.types.js';

/**
 * What the menu needs to know about a column: its key and what to call it.
 *
 * NOT `Column<T>`, and the narrowing is the point. This part needs a name and
 * an identity; `cell`, `align`, `width`, `sortable` and the rest decide how a
 * column RENDERS, and accepting them would make the menu generic over `T` for
 * data it never touches. Spread `visibility.menuProps` and the shape lines up.
 */
export interface ColumnListing {
  key: string;
  header: ReactNode;
}

export interface TableColumnsMenuProps {
  /** Every column the table could show, in the order it would show them. */
  columns: readonly ColumnListing[];
  /** Which are currently put away. */
  hidden: HiddenColumns;
  /**
   * Whether a column may be toggled at all. Comes from `useColumnVisibility`,
   * which owns the two refusals — the row header and the last one standing.
   */
  canHide: (key: string) => boolean;
  /** Put one away, or bring it back. */
  onToggle: (key: string) => void;
  /**
   * What the trigger looks like. `ghost` by default, because this sits in a
   * toolbar beside other view controls and a filled button there would claim to
   * be the primary action of the page.
   */
  variant?: 'ghost' | 'secondary';
  children?: never;
}
