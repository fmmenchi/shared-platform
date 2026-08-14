import styles from './date-picker.module.css';

/**
 * The calendar, drawn rather than borrowed — the same argument the funnel and
 * the sort arrow make. An icon set is brand identity and lives app-side, and a
 * picker whose trigger was blank until an app injected one would break on
 * somebody else's configuration.
 *
 * `aria-hidden` because the button's accessible name already says it in words.
 * A glyph is not a label.
 */
function CalendarGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={styles.glyph}>
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
