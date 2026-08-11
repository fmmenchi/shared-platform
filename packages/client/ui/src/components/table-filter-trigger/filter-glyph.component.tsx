import { cn } from '../../util/cn.js';
import type { FilterGlyphProps } from './filter-glyph.types.js';
import styles from './table-filter-trigger.module.css';

/**
 * The funnel, drawn rather than borrowed — the same argument the sort arrow
 * makes. An icon set is brand identity and lives app-side, and a table that
 * could not show a column was filtered until the app injected one would break
 * on somebody else's configuration.
 *
 * `aria-hidden` because the trigger's accessible NAME already says it, in
 * words, including the value. That is deliberate: a state carried only by a
 * tinted glyph is a state carried by colour alone.
 */
function FilterGlyph({ active, className, ...rest }: FilterGlyphProps) {
  return (
    <svg
      {...rest}
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn(styles.glyph, className)}
      data-active={active === true ? '' : undefined}
    >
      {/* One shape, filled or outlined — not two glyphs swapped, so the change
          is a value CSS can transition rather than an element React replaces. */}
      <path
        d="M1.5 2h9l-3.5 4v3.5l-2 1V6z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { FilterGlyph };
