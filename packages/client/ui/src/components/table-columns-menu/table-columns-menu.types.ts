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
  /**
   * The column's name IN WORDS, for the places a `header` cannot go — which is
   * every place this menu needs one: the typeahead, and the sentence that says
   * why a column cannot be put away.
   *
   * IT WAS LEFT OUT AT FIRST, and the narrowing was called "the point". It was
   * the wrong thing to narrow away: a column headed by an icon, an `<abbr>` or
   * a `Badge` — the exact cases `label` exists for — came out of this menu with
   * an empty name, so a locked entry announced as ", always shown because it
   * names the rows" and typeahead could not reach it at all.
   */
  label?: string;
}

interface TableColumnsMenuShared {
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

/**
 * Reordering, which is THREE PROPS OR NONE.
 *
 * They were three optional props and a comment that said "required with
 * `onMove`" — which is a rule the type could not enforce and the component then
 * could not rely on. Measured with `onMove` and `positionOf` and no `canMove`:
 * every entry announced "Nome, 1 of 2", telling the reader the column moves and
 * where it sits, and `Alt`+`ArrowDown` called `onMove` ZERO times, because
 * `canMove?.(…)` is `undefined` and `undefined` is not true. A promise made in
 * the accessible name and refused in silence — and refused to precisely the
 * reader who cannot see that nothing moved.
 *
 * A union rather than three `required` flags, because the alternative — leaving
 * `onMove` alone and only requiring the other two — would still admit the
 * halfway state. `useColumnOrder`'s `menuProps` supplies all three, so the
 * wired path is one spread and this shape is what it already had.
 */
interface TableColumnsMenuReorder {
  /**
   * Move a column earlier (`-1`) or later (`+1`). Each entry then says where it
   * sits and answers Alt with the arrow keys.
   *
   * Comes from `useColumnOrder`, which owns the clamping — spread its
   * `menuProps` beside the visibility hook's.
   */
  onMove: (key: string, delta: number) => void;
  /** Whether that move would go anywhere — the clamp, at the ends of the list. */
  canMove: (key: string, delta: number) => boolean;
  /** Where a column sits now, counting from 1. */
  positionOf: (key: string) => number;
}

/** No reordering: the menu only decides which columns are shown. */
interface TableColumnsMenuStatic {
  onMove?: never;
  canMove?: never;
  positionOf?: never;
}

export type TableColumnsMenuProps = TableColumnsMenuShared &
  (TableColumnsMenuReorder | TableColumnsMenuStatic);
