import { cva } from 'class-variance-authority';
import styles from './input-group.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling lives
// in `input-group.module.css`. Kept out of the component file so that file exports
// only the component (React Fast Refresh requires that).
export const inputGroupVariants = cva(styles.group, {
  variants: {
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
  },
  defaultVariants: { size: 'md' },
});
