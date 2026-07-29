import { cva } from 'class-variance-authority';
import styles from './input.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `input.module.css`. Kept out of the component file so that file
// exports only the component (React Fast Refresh requires that).
//
// Input has ONE axis — `size` — with heights matching Button (32/36/44), so a
// control and a button align on the same row. There is no colour `variant`: the
// invalid look is driven by the native `aria-invalid` attribute (styled in css),
// which every form library already sets — maximum transparency (ADR-0013).
export const inputVariants = cva(styles.input, {
  variants: {
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
  },
  defaultVariants: { size: 'md' },
});
