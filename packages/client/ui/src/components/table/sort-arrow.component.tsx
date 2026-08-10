import { cn } from '../../util/cn.js';
import type { SortArrowProps } from './sort-arrow.types.js';
import styles from './table.module.css';

/**
 * The direction, drawn rather than borrowed.
 *
 * A functional glyph a component needs to work is drawn inline — an icon set is
 * brand identity and lives app-side, and a table that could not show its sort
 * direction without one would be a table that stops working when the app
 * forgets to inject icons.
 *
 * IN ITS OWN FILE because a `.component.tsx` holds one component and its type
 * lives beside it; it was a second declaration with an inline props literal,
 * which is the one rule this package repeats at every level.
 *
 * DRAWN AS AN SVG rather than as border triangles on a pseudo-element, which is
 * how the accordion's chevron and the anchored surfaces' arrow are built and
 * was the obvious precedent to follow. It does not reach: those are ONE glyph
 * apiece, and a pseudo-element cannot have pseudo-elements of its own, so two
 * marks that fade and lean INDEPENDENTLY need two boxes. Both are always drawn
 * — the pair is what says "this column can be ordered", and a glyph that
 * appeared only once sorted would leave an unsorted column looking inert.
 *
 * `aria-hidden` because `aria-sort` on the `<th>` says all of this to a reader
 * who is not looking, in words, including the `none` that marks the column as
 * orderable in the first place.
 */
export function SortArrow({ direction, className, ...rest }: SortArrowProps) {
  return (
    <svg
      {...rest}
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn(styles.sortArrow, className)}
      data-direction={direction ?? 'none'}
    >
      {/* Which one is in force is OPACITY — a value CSS can transition, rather
          than an attribute React swaps, which nothing can animate. */}
      <path data-arrow="asc" d="M6 1.5 L9.5 5.5 H2.5 Z" fill="currentColor" />
      <path data-arrow="desc" d="M6 10.5 L2.5 6.5 H9.5 Z" fill="currentColor" />
    </svg>
  );
}
