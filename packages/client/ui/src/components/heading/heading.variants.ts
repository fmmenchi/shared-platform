import { cva } from 'class-variance-authority';
import styles from './heading.module.css';

/**
 * The visual axis, and only that: the tag comes from `level`, never from here.
 *
 * The steps are named for the heading they LOOK like, which is the vocabulary
 * the design system already speaks — `DialogHeading` takes `as="h3"`, and
 * `surface-heading.types.ts` has held `'h1' | … | 'h6'` since before this
 * component existed. It also makes the call site read as the sentence the docs
 * use: `level={2} size="h4"` is "an h2 that looks like an h4". Naming them for
 * the type scale instead (`lg`, `2xl`) meant a caller translating twice, and
 * collided with the `size="sm|md|lg"` five other components already use.
 *
 * There is deliberately no level→size lookup table: the default IS the
 * identity, `size` defaults to `h${level}`. The table this replaced could be
 * scrambled — h4 larger than h1 — with the whole suite green.
 */
export const headingVariants = cva(styles.heading, {
  variants: {
    size: {
      h1: styles.h1,
      h2: styles.h2,
      h3: styles.h3,
      h4: styles.h4,
      h5: styles.h5,
      h6: styles.h6,
    },
  },
  // Only for a caller using this export directly, who has no `level` to derive
  // from; the component always passes one explicitly.
  defaultVariants: { size: 'h2' },
});
