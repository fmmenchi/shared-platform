import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { badgeVariants } from './badge.variants.js';
import type { BadgeProps } from './badge.types.js';
import styles from './badge.module.css';

/**
 * A small presentational label for a status, category, or count — the semantic
 * `variant` gives it meaning (success, warning, brand identity…). Built on a
 * native `<span>`: its text is its accessible name, so colour only reinforces
 * what the label already says (WCAG 1.4.1).
 */
function Badge(props: BadgeProps) {
  const { className, variant, emphasis, size, icon, children, ...rest } = props;
  const attrs = rest as Record<string, unknown>;

  // Colour alone is never the signal: a badge with an icon but no text (and no
  // explicit label) has no discernible name. Warn instead of failing silently.
  // A falsy child that renders nothing (`false`/`''` from a conditional, `null`)
  // counts as NO label — but `0` is a real count, so it does count. axe won't
  // flag an unnamed <span>, so this guard is the only protection.
  const hasLabel =
    (children != null && children !== false && children !== '') ||
    attrs['aria-label'] != null ||
    attrs['aria-labelledby'] != null;
  useDevWarning(
    icon != null && !hasLabel,
    'Badge: an icon-only badge has no discernible text — pass text or `aria-label`.',
  );

  return (
    <span
      className={cn(badgeVariants({ variant, emphasis, size }), className)}
      {...rest}
    >
      {icon != null && (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

export { Badge };
