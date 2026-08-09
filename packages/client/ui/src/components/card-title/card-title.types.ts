import type { ReactNode } from 'react';
import type { HeadingProps } from '../heading/heading.types.js';

export interface CardTitleProps extends Omit<HeadingProps, 'children'> {
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
  /**
   * An `href`, and only an `href`.
   *
   * It reaches your router through the same `Link` adapter `NavLink` uses, so
   * navigation is client-side — but unlike `NavLink` this component forwards no
   * other prop to the link. Everything besides `href` and `children` goes to
   * `Heading`, which is what a card title's props are for.
   *
   * So a route descriptor does not fit here: `to`, `params` and `search`
   * neither typecheck nor arrive, and the `NavLinkExtraProps` augmentation does
   * not apply. Resolve it to a path and pass that; both routers can build one.
   */
  href?: string;
  /**
   * Render the child you pass as the link, instead of building one from `href`.
   *
   * ```tsx
   * <CardTitle level={3} asChild>
   *   <RouterLink to="/orders/$id" params={{ id }}>Order</RouterLink>
   * </CardTitle>
   * ```
   *
   * The escape from what `href` cannot say. You write your router's link
   * yourself — its real props, checked by its own types, with no augmentation
   * and no cast — and this component puts its class and its `data-card-link`
   * hook onto it, so the invisible whole-card layer works exactly as it does
   * for `href`. That layer is a hashed class this component owns, which is why
   * a hand-rolled link cannot get there on its own.
   *
   * YOUR component must forward what it does not consume. The class and the
   * `data-card-link` hook arrive as props on the element you wrote, so a
   * component that keeps only the props it knows discards them — and with them
   * the whole-card layer.
   *
   * `children` stops being the title text and becomes the element that
   * contains it. Exactly one element: anything else is rendered untouched with
   * a warning, and the layer is lost.
   *
   * With `href`, `asChild` wins and the `href` is ignored — they are two
   * destinations, not one destination described twice, so it warns.
   */
  asChild?: boolean;
  children: ReactNode;
}
