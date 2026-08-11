import { cn } from '../../util/cn.js';
import { hasRenderableChildren } from '../../util/renderable-children.js';
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
  // THROUGH `hasRenderableChildren`, not a hand check: the hand-written one
  // covered `null`/`false`/`''` and let through the three shapes the util's own
  // doc names — the empty array (`{items}` from a filter that matched nothing),
  // whitespace, and `true` — so the badge this guard exists for shipped unnamed
  // through exactly the inputs a real call site produces. `0` still counts as a
  // label, because the util renders it: a zero is a real count. axe won't flag
  // an unnamed <span>, so this guard is the only protection.
  const hasLabel =
    hasRenderableChildren(children) ||
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
