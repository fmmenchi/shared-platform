import { cn } from '../../util/cn.js';
import type { ExpandChevronProps } from './expand-chevron.types.js';
import styles from './table.module.css';

/**
 * Which way the row's detail is, drawn rather than borrowed — the same argument
 * the sort arrow makes: an icon set is brand identity and lives app-side, and a
 * table that could not show whether a row was open until the app injected one
 * would break on somebody else's configuration.
 *
 * `aria-hidden`, and this one is not a judgement call: the button already
 * carries `aria-expanded`, which is the state in the form every screen reader
 * reads. A second copy in the name would say it twice.
 */
function ExpandChevron({ open, className, ...rest }: ExpandChevronProps) {
  return (
    <svg
      {...rest}
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn(styles.chevron, className)}
      data-open={open === true ? '' : undefined}
    >
      {/* ONE SHAPE, ROTATED, so the change is a transform CSS can transition
          rather than an element React replaces — and so `rtl` mirrors it for
          free, since the rotation is applied to a glyph that points along the
          inline axis. */}
      <path
        d="M4.5 2.5 8 6l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { ExpandChevron };
