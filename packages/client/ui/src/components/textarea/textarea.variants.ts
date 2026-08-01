import { cva } from 'class-variance-authority';
import styles from './textarea.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `textarea.module.css`. Kept out of the component file so that file
// exports only the component (React Fast Refresh requires that).
//
// Two axes, and neither is a colour. `size` is Input's, minus the fixed height
// a multi-line field must not have — it sets type scale and padding, and the
// height comes from `rows`, which is the browser's own knob and stays the
// consumer's. `resize` is here because the browser's default (`both`) lets a
// user drag a field wider than the form that contains it, which no layout
// survives; vertical is the sane default and the axis exists to say otherwise.
//
// There is no colour `variant`: the invalid look keys off the native
// `[aria-invalid="true"]`, which every form library already sets (ADR-0013).
export const textareaVariants = cva(styles.textarea, {
  variants: {
    size: {
      sm: styles.sm,
      md: styles.md,
      lg: styles.lg,
    },
    resize: {
      vertical: styles.resizeVertical,
      none: styles.resizeNone,
    },
  },
  defaultVariants: { size: 'md', resize: 'vertical' },
});
