import { cva } from 'class-variance-authority';
import styles from './skeleton.module.css';

// `cva` maps the public variant API to CSS-module class names; the styling
// lives in `skeleton.module.css`. Kept out of the component file so that
// file exports only the component (React Fast Refresh requires that).
//
// The axis is SHAPE, not a token role: a skeleton paints one surface
// (`muted`) and never a second, so there is no treatment to choose between.
// What does vary is the outline of the thing it stands in for, and the three
// below are the ones that carry a decision the consumer would otherwise
// re-derive — a line that tracks the type it replaces, a panel with a card's
// corners, a circle that stays round when it is resized.
export const skeletonVariants = cva(styles.skeleton, {
  variants: {
    shape: {
      text: styles.text,
      block: styles.block,
      circle: styles.circle,
    },
  },
  defaultVariants: { shape: 'text' },
});
