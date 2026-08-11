import { cn } from '../../util/cn.js';
import type { ProgressProps } from './progress.types.js';
import styles from './progress.module.css';

/**
 * How far along something is — a determinate bar when you know, and an
 * indeterminate one when you do not.
 *
 * IT IS THE `<progress>` ELEMENT, not a div wearing `role="progressbar"`. The
 * platform supplies the role, the value, the maximum and the percentage it
 * announces; it decides indeterminate from the absence of `value`; and it keeps
 * all of that in step with no code of ours. A div would need four attributes
 * kept correct by hand, and the fourth is the one that drifts.
 *
 * NO VARIANTS, and that is a decision rather than an omission. A bar that turns
 * red is saying something the surrounding message has to say anyway — colour
 * alone cannot carry it (WCAG 1.4.1) — and status belongs to `Alert`, which is
 * built to hold a sentence. If a second treatment is ever earned it can be
 * added without breaking this one.
 *
 * The `label` is required for the same reason `Nav`'s is: a progress bar with
 * no name announces a percentage of nothing.
 */
function Progress(props: ProgressProps) {
  const { className, label, value, ...rest } = props;

  return (
    <progress
      className={cn(styles.progress, className)}
      // BEFORE the spread, so a caller's own `aria-label` replaces it rather
      // than losing to it — and `aria-labelledby`, which ARIA ranks higher,
      // wins wherever it is passed.
      aria-label={label}
      // Written explicitly rather than left to the spread: `undefined` has to
      // reach the DOM as an ABSENT attribute, which is what makes the element
      // indeterminate. Spreading a `value: undefined` does the same thing, but
      // only by accident of how React serialises it.
      value={value}
      {...rest}
    />
  );
}

export { Progress };
