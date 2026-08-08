import type { ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';
import type { cardVariants } from './card.variants.js';

/** Paint, derived from the cva definition. */
export type CardVariants = VariantProps<typeof cardVariants>;

/**
 * What a card is allowed to BE — constrained, the way `SurfaceHeading` limits
 * `as` to a heading level and `NavLink` requires its own to end in an anchor.
 * `as` in this package is not "any element", it is "the elements that are
 * legal here", and a card is a container: `<div>` when it means nothing,
 * `<article>` when it is self-contained enough to stand on its own page,
 * `<section>` when it is named part of a larger whole, `<li>` inside a list.
 *
 * `a` is here because a tile with ONE destination and no other action is a
 * real thing. It is also the one that cannot hold a button or a second link —
 * HTML forbids interactive content inside `<a>` — so a card that is an anchor
 * checks itself at runtime and says so.
 */
export type CardElement = 'div' | 'article' | 'section' | 'li' | 'a';

export interface CardOwnProps extends CardVariants {
  /** The card's content. */
  children: ReactNode;
}

/** Public Card props — polymorphic via `as`, within `CardElement`. */
export type CardProps<As extends CardElement = 'div'> = PolymorphicProps<
  As,
  CardOwnProps
> & { as?: As };
