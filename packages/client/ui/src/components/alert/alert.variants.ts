import { cva } from 'class-variance-authority';
import styles from './alert.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `alert.module.css`. Kept out of the component file so that file
// exports only the component (React Fast Refresh requires that).
//
// `variant` is the semantic STATUS role. Each is the tinted-surface treatment
// of its family — `*-subtle` fill, `*-subtle-foreground` text, `*-border` — all
// declared AA pairs. `error` is the feedback-red status family (distinct from
// the `destructive` action role).
export const alertVariants = cva(styles.alert, {
  variants: {
    variant: {
      info: styles.info,
      success: styles.success,
      warning: styles.warning,
      error: styles.error,
    },
  },
  defaultVariants: { variant: 'info' },
});
