import styles from './tag.module.css';

/**
 * The ✕, drawn rather than borrowed — the same argument the sort arrow and the
 * funnel make. An icon set is brand identity and lives app-side (ADR-0001), and
 * a tag that could not be removed until the app injected a glyph would be a
 * control that breaks on somebody else's configuration.
 *
 * `aria-hidden` because the button around it already says the whole thing in
 * words, with the tag's own text in it: "Remove Milano". A cross that is the
 * only channel is a control named by a shape.
 */
function RemoveGlyph() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={styles.glyph}>
      {/* Two strokes, not a glyph font and not a path with a fill: at 12px the
          cross reads as two lines, and `currentColor` on a stroke is what lets
          it inherit the button's foreground role in every variant and in
          forced colours. `round` caps keep it from looking chipped at the
          fractional sizes a zoomed page produces. */}
      <path
        d="M3 3l6 6M9 3l-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { RemoveGlyph };
