/**
 * The calendar, drawn rather than borrowed — the same argument the funnel and
 * the sort arrow make. An icon set is brand identity and lives app-side, and a
 * picker whose trigger was blank until an app injected one would break on
 * somebody else's configuration.
 *
 * `aria-hidden` because the button's accessible name already says it in words.
 * A glyph is not a label.
 *
 * IT DECLARES NO SIZE. `Button`'s icon slot owns that — 1em square, the same as
 * the spinner it swaps with, so loading never shifts the layout — and it sizes
 * whatever is injected. A glyph that measured itself would be the one icon in
 * the package not obeying that contract.
 */
function CalendarGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      {/* One path for the box, two for the binding posts. `currentColor`
          throughout, so it takes the button variant's colour rather than
          declaring one of its own. */}
      <rect
        x="1.5"
        y="3.5"
        width="13"
        height="11"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1.5 7h13M5 1.5v3M11 1.5v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export { CalendarGlyph };
