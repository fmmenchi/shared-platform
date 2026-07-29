import { cva } from 'class-variance-authority';
import styles from './badge.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `badge.module.css`. Kept out of the component file so that file
// exports only the component (React Fast Refresh requires that).
//
// Three ORTHOGONAL axes (the Radix Themes lesson — never conflate them like
// shadcn's single `variant`):
//   • variant  — the semantic COLOUR role (brand identity or status feedback);
//   • emphasis — the TREATMENT: `soft` (the *-subtle pill) or `solid` (the fill);
//   • size     — sm / md / lg.
// A variant class sets the family's fill + subtle colour vars; an emphasis class
// consumes the pair for its treatment — so the matrix stays 7 + 2 blocks, not
// 7×2. `outline` is intentionally absent until brand families gain a `-border`
// token (see badge.mdx).
export const badgeVariants = cva(styles.badge, {
  variants: {
    variant: {
      neutral: styles.neutral,
      primary: styles.primary,
      accent: styles.accent,
      destructive: styles.destructive,
      success: styles.success,
      warning: styles.warning,
      info: styles.info,
    },
    emphasis: {
      soft: styles.soft,
      solid: styles.solid,
    },
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
  },
  defaultVariants: { variant: 'neutral', emphasis: 'soft', size: 'md' },
});
