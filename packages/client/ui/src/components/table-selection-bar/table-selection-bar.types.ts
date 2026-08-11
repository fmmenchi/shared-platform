import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { Selection } from '../../selection/selection.types.js';

export interface TableSelectionBarProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /** The rule, as `useRowSelection` holds it. */
  selection: Selection;
  /**
   * The result set's size — NOT the page's.
   *
   * It does two jobs and they are the same job: it is what makes the count
   * answerable under an `exclude` rule, and what tells the bar there is
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
  onClear: () => void;
  /**
   * What the bar is called — it is a labelled region, so a page carrying two
   * of them owes each one a name of its own. Defaults to the design system's
   * wording for the actions.
   */
  label?: string;
  /**
   * The bulk actions — delete, export, assign. Each wrapped in a `ToolbarItem`,
   * like any other toolbar's controls: an unwrapped control keeps its own tab
   * stop, which is the one thing the bar exists to avoid.
   */
  children?: ReactNode;
}
