import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { HeadingLevel } from '../../primitives/surface-heading.types.js';

export interface CardTitleProps extends Omit<
  ComponentPropsWithRef<'h3'>,
  'children'
> {
  /**
   * The heading level. `h3` by default, and there is no clever default to be
   * had: the right level depends on the page the card sits in, which the
   * design system cannot see. A grid of cards under an `<h2>` wants `h3`; the
   * same card as the only thing on a page wants `h1`.
   */
  as?: HeadingLevel;
  /**
   * Where the card goes. Given one, the title becomes a link AND THE WHOLE CARD
   * BECOMES CLICKABLE: the anchor stays here, around this text, while an
   * invisible layer belonging to it covers the card.
   *
   * That is the point of doing it this way. The accessible name of the link is
   * this heading's text — not the card's whole contents, which is what a card
   * wrapped in an `<a>` announces — and there is one link in the tab order,
   * not one per card element.
   *
   * Two consequences to know before using it. Selecting text inside the card
   * with the mouse becomes awkward, because the invisible layer takes the
   * drag; and anything else clickable in the card has to sit above that layer,
   * which is what `CardActions` does for you.
   *
   * Without it, this is a heading and nothing more.
   */
  href?: string;
  children: ReactNode;
}
