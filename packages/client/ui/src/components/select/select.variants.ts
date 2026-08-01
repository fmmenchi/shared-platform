import { cva } from 'class-variance-authority';
import styles from './select.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `select.module.css`. Kept out of the component file so that file
// exports only the component (React Fast Refresh requires that).
//
// ONE axis — `size` — with the same heights as Input and Button (32/36/44), so
// a select, a text field and a button line up on the same row. It shadows the
// native `size` attribute (a row count, which turns a select into a list box),
// and that is stated in the props type rather than left to be discovered.
//
// There is no colour `variant`: the invalid look keys off the native
// `aria-invalid`, which every form library already sets (ADR-0013).
export const selectVariants = cva(styles.select, {
  variants: {
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
  },
  defaultVariants: { size: 'md' },
});
