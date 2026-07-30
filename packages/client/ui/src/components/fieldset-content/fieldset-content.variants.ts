import { cva } from 'class-variance-authority';
import styles from './fieldset-content.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `fieldset.module.css`. Kept out of the component file so that
// file exports only the component (React Fast Refresh requires that).
//
// Only `FieldsetContent` has a variant axis: the `<fieldset>` itself is layout
// and UA reset, with no treatments to choose between.
export const fieldsetContentVariants = cva(styles.content, {
  variants: {
    orientation: {
      vertical: styles.vertical,
      horizontal: styles.horizontal,
    },
  },
  defaultVariants: { orientation: 'vertical' },
});
