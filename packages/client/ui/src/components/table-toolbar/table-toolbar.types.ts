import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { Selection } from '../../selection/selection.types.js';

export interface TableToolbarProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /**
   * What the view is showing, in words — a row count, the filters in force,
   * anything a reader needs before the rows rather than after them.
   *
   * It is a SLOT because the toolbar does not own every table-level fact: it
   * owns the shell, the landmark and the tab-stop economy. What it can compose
   * itself — the selection — it composes; the rest arrives here and is stated
   * beside it.
   */
  summary?: ReactNode;
  /**
   * What this set of controls is called. Stable on purpose: the toolbar is
   * permanent for a table that has table-level features, so a name that
   * changed with its contents would be a landmark that renames itself under
   * the reader. The COUNT is a description, not a name — it reaches a screen
   * reader through `aria-describedby`, which is announced on entry.
   *
   * Override it when a page carries two tables, which is the one case the
   * default cannot disambiguate.
   */
  label?: string;
  /**
   * The rule, as `useRowSelection` holds it. Optional: a table that filters and
   * does not select has a toolbar too.
   */
  selection?: Selection;
  /**
   * The result set's size — NOT the page's.
   *
   * It does two jobs and they are the same job: it is what makes the count
   * answerable under an `exclude` rule, and what tells the toolbar there is
   * anything beyond the page to offer. The count is DERIVED from it here
   * rather than passed alongside it, which was the first shape and a bad one:
   * two places to put one number let the escalation say "Select all 7" and
   * then select 2,450, with nothing warning.
   */
  total?: number;
  /**
   * Take everything the query matched, including rows this client never
   * received. Omit it and the offer is not made.
   */
  onSelectEverything?: () => void;
  /** Put the selection back to nothing. */
  onClear?: () => void;
  /**
   * The bulk actions — delete, export, assign. Each wrapped in a `ToolbarItem`,
   * like any other toolbar's controls: an unwrapped control keeps its own tab
   * stop, which is the one thing the toolbar exists to avoid.
   */
  children?: ReactNode;
}
