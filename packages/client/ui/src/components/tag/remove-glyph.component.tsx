/**
 * The ✕, drawn rather than borrowed — the same argument the calendar, the funnel
 * and the sort arrow make. An icon set is brand identity and lives app-side
 * (ADR-0001), and a tag that could not be removed until the app injected a glyph
 * would be a control that breaks on somebody else's configuration.
 *
 * `aria-hidden` because the button around it already says the whole thing in
 * words, with the tag's own text in it: "Remove Milano". A cross that is the
 * only channel is a control named by a shape.
 *
 * IT DECLARES NO SIZE, the rule `CalendarGlyph` states: `Button`'s icon slot
 * owns that — 1em square, the same as the spinner it swaps with. A glyph that
 * measured itself would be the one icon in the package not obeying the
 * contract, and it would also be racing that slot's own rule for the same
 * specificity, where the winner is whichever the bundle happens to emit last.
 */
function RemoveGlyph() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      {/* Two strokes, not a path with a fill: at this size the cross reads as
          two lines, and `currentColor` on a stroke is what lets it take the
          button's foreground rather than declaring one of its own. `round`
          caps keep it from looking chipped at the fractional sizes a zoomed
          page produces. */}
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
