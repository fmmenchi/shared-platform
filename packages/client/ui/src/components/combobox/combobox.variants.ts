import { cva } from 'class-variance-authority';
import styles from './combobox.module.css';

// The visible field's size axis, and it is `Input`'s and `Select`'s: three
// controls on one row of one form that did not match would read as three
// different systems. The classes come from the shared `control-*` utilities,
// so the three cannot drift.
export const comboboxVariants = cva(styles.combobox, {
  variants: {
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
  },
  defaultVariants: { size: 'md' },
});
