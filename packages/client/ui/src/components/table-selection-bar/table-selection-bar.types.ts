import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { Selection } from '../../selection/selection.types.js';

export interface TableSelectionBarProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /** The rule, as `useRowSelection` holds it. */
  selection: Selection;
  /**
   * How many rows it covers, `undefined` when only the server knows.
   *
   * `undefined` is not a hole to paper over: it is the state the whole model
   * exists for, and the bar says "all rows selected" rather than inventing a
   * number. Pass `total` to `useRowSelection` and it becomes a count.
   */
  count: number | undefined;
  /**
   * The result set's size. Its presence is what makes the escalation possible —
   * without it nobody on this side knows there is anything beyond the page.
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
   * What the bar's controls are called as a group. Defaults to the design
   * system's own wording; override it when a page carries two of them.
   */
  label?: string;
  /**
   * The bulk actions — delete, export, assign. Each wrapped in a `ToolbarItem`,
   * like any other toolbar's controls.
   */
  children?: ReactNode;
}
