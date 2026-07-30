import { cva } from 'class-variance-authority';
import styles from './input-group-slot.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling lives
// in `input-group-slot.module.css`. Kept out of the component file so that file
// exports only the component (React Fast Refresh requires that).
export const inputGroupSlotVariants = cva(styles.slot, {
  variants: {
    interactive: {
      true: styles.interactive,
      false: styles.decorative,
    },
  },
  defaultVariants: { interactive: false },
});
