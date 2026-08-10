import type { Selection, SelectionCoverage } from './selection.types.js';

/**
 * Selection as SET ALGEBRA over a rule, not as a list of rows.
 *
 * PURE AND ISOMORPHIC — no React, no DOM, no state — so it is provable without
 * rendering anything, and so it can move to `packages/shared/` unchanged the
 * day the server has to answer "which rows did they mean?". That day arrives
 * with the first bulk action: the client sends the rule, and the server is the
 * only side that can turn "everything except these three" into rows.
 *
 * THE TWO MODES ARE ONE OPERATION, which is the observation the whole file
 * rests on. Toggling a row is "flip its membership in `ids`" in BOTH modes —
 * in `include` that adds or removes a selected row, in `exclude` it removes or
 * adds an exception, and the two are the same edit. Only the READING differs.
 * Writing them as two branches is how this kind of code grows a bug where the
 * mode nobody tested inverts.
 */

/** Nothing selected. Shared, because an empty rule has no identity worth having. */
export const NOTHING_SELECTED: Selection = Object.freeze({
  mode: 'include' as const,
  ids: Object.freeze(new Set<string>()),
});

/**
 * EVERYTHING, including rows this client has never seen.
 *
 * Not what a header checkbox produces — that one can only speak for the rows it
 * renders. This is the other affordance, the one a paginated table offers after
 * you tick the header: "all 20 on this page are selected — select all 10,000?".
 * Exported so a consumer can build that today, since only they know whether
 * their result set has more rows than the ones they handed over.
 */
export const EVERYTHING_SELECTED: Selection = Object.freeze({
  mode: 'exclude' as const,
  ids: Object.freeze(new Set<string>()),
});

/** Is this row in? */
export function isRowSelected(selection: Selection, id: string): boolean {
  return selection.mode === 'include'
    ? selection.ids.has(id)
    : !selection.ids.has(id);
}

/**
 * Flip one row.
 *
 * One edit for both modes — see the file header. A new `Set` every time rather
 * than a mutation, because this value is React state: mutating it in place
 * gives a table that re-renders with the old rows and a changed selection, or
 * does not re-render at all.
 */
export function toggleRow(selection: Selection, id: string): Selection {
  const ids = new Set(selection.ids);
  if (!ids.delete(id)) ids.add(id);
  return { mode: selection.mode, ids };
}

/** How many of these particular rows are selected. */
export function countIn(selection: Selection, ids: readonly string[]): number {
  let selected = 0;
  for (const id of ids) if (isRowSelected(selection, id)) selected += 1;
  return selected;
}

/**
 * How much of `ids` is selected — what a header checkbox has to show.
 *
 * An EMPTY set of rows is `none`, not `all`. Vacuously every one of no rows is
 * selected, and a filled header box over an empty table is a statement a reader
 * would act on.
 */
export function coverageOf(
  selection: Selection,
  ids: readonly string[],
): SelectionCoverage {
  if (ids.length === 0) return 'none';
  const selected = countIn(selection, ids);
  return selected === 0 ? 'none' : selected === ids.length ? 'all' : 'some';
}

/**
 * Select or clear a specific set of rows — the ones a header checkbox can see.
 *
 * "All of them are already in, so take them out; otherwise put them in." The
 * partially-selected case resolves to SELECT rather than to clear, which is the
 * convention every table follows and the one that matches the mixed box's
 * meaning: a reader clicking a half-filled box is completing it.
 */
export function toggleRows(
  selection: Selection,
  ids: readonly string[],
): Selection {
  const wanted = coverageOf(selection, ids) !== 'all';
  const next = new Set(selection.ids);

  for (const id of ids) {
    // In `include` a wanted row belongs in the set; in `exclude` it belongs
    // OUT of it. The condition is the mode and the intention agreeing.
    if (wanted === (selection.mode === 'include')) next.add(id);
    else next.delete(id);
  }

  return { mode: selection.mode, ids: next };
}

/**
 * How many rows are selected, or `undefined` when only the server knows.
 *
 * The honest answer under `exclude` is a number this side cannot produce: the
 * rule covers rows that were never sent. Returning `0`, or the count of what
 * happens to be loaded, is how a table ends up telling a reader it will delete
 * three records and deleting ten thousand.
 */
export function countSelected(
  selection: Selection,
  total?: number,
): number | undefined {
  if (selection.mode === 'include') return selection.ids.size;
  if (total === undefined) return undefined;
  return Math.max(0, total - selection.ids.size);
}
