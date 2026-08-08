import { cva } from 'class-variance-authority';
import styles from './card.module.css';

/**
 * How the card is lifted off the page. Both are pure paint — a card carries no
 * state, so there is nothing else for a variant to say.
 */
export const cardVariants = cva(styles.card, {
  variants: {
    variant: {
      /** A hairline. The default, because a page of shadows is a page of noise. */
      outlined: styles.outlined,
      /** A shadow, for a card that floats above content rather than sitting in it. */
      elevated: styles.elevated,
    },
  },
  defaultVariants: { variant: 'outlined' },
});
