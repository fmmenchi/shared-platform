import { cva } from 'class-variance-authority';
import styles from './tab.module.css';

// DELETE THIS FILE if the component has no variant axis — a compound's container
// usually has none (it is layout and wiring, with no treatments to choose from).
// Deleting it means also dropping `TabVariants` from the types file
// and the `tabVariants` line from the root barrel.
//
// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `tab.module.css`. Kept out of the component file so that
// file exports only the component (React Fast Refresh requires that).
export const tabVariants = cva(styles.tab, {
  variants: {
    variant: {
      // TODO: one class per token role/treatment this component supports.
      primary: styles.primary,
    },
  },
  defaultVariants: { variant: 'primary' },
});
