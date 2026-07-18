import { cva } from 'class-variance-authority';
import styles from './button.module.css';

// `cva` maps the public variant API to CSS-module class names. The styling
// lives in `button.module.css`. Kept out of the component file so that file
// exports only the component (React Fast Refresh requires that).
export const buttonVariants = cva(styles.button, {
  variants: {
    variant: {
      primary: styles.primary,
      secondary: styles.secondary,
      ghost: styles.ghost,
      destructive: styles.destructive,
    },
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
