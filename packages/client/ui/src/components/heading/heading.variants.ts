import { cva } from 'class-variance-authority';
import styles from './heading.module.css';

/**
 * The visual axis, and only that: the tag comes from `level`, never from here.
 *
 * The steps carry the type scale's own names (`@fmmenchi/tokens`) rather than
 * invented ones like `display`/`title`. A caller who has read the scale already
 * knows this API, and a second vocabulary over the same values would have to be
 * kept in step with them by hand.
 */
export const headingVariants = cva(styles.heading, {
  variants: {
    size: {
      '4xl': styles.size4xl,
      '3xl': styles.size3xl,
      '2xl': styles.size2xl,
      xl: styles.sizeXl,
      lg: styles.sizeLg,
      base: styles.sizeBase,
    },
  },
});

/**
 * What each level looks like when nobody says otherwise.
 *
 * It stops at `base` rather than shrinking further: an `<h5>` and an `<h6>`
 * smaller than body text would be a heading a sighted reader cannot find, and
 * the weight already separates them. Below `h4` the distinction is carried by
 * position and weight, not by size.
 */
export const SIZE_FOR_LEVEL = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
  5: 'base',
  6: 'base',
} as const;
